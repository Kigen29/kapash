import prisma from '../config/database';

export async function nextInvoiceNumber(): Promise<string> {
  const year = new Date().getFullYear();
  const prefix = `INV-${year}-`;
  // Find highest existing number for this year and increment
  const latest = await prisma.invoice.findFirst({
    where: { number: { startsWith: prefix } },
    orderBy: { number: 'desc' },
    select: { number: true },
  });
  const nextN = latest
    ? parseInt(latest.number.slice(prefix.length), 10) + 1
    : 1;
  return `${prefix}${String(nextN).padStart(4, '0')}`;
}

interface EventForInvoice {
  id: string;
  name: string;
  totalAmount: number;
  bookings: Array<{
    pitchName: string;
    date: Date;
    startTime: string;
    endTime: string;
    durationMins: number;
    totalAmount: number;
    pitch?: { name: string };
  }>;
}

export function computeLineItemsFromEvent(event: EventForInvoice) {
  const lineItems = event.bookings.map(b => ({
    description: `${b.pitchName} · ${b.date.toISOString().split('T')[0]} · ${b.startTime}–${b.endTime}`,
    qty: 1,
    unitPrice: b.totalAmount,
    total: b.totalAmount,
  }));
  const subtotal = lineItems.reduce((s, li) => s + li.total, 0);
  return { lineItems, subtotal };
}

interface InvoiceForRender {
  number: string;
  issuedAt: Date;
  dueDate: Date;
  status: string;
  amount: number;
  tax: number;
  total: number;
  notes: string | null;
  lineItems: any;
  paymentRef: string | null;
  paidAt: Date | null;
  corporate: {
    name: string;
    tradingName: string | null;
    email: string;
    phone: string;
    billingAddress: string;
    kraPin: string | null;
  };
  event?: { name: string; date: Date } | null;
}

export function renderInvoiceHtml(invoice: InvoiceForRender): string {
  const items: Array<{ description: string; qty: number; unitPrice: number; total: number }> = invoice.lineItems || [];
  const ksh = (n: number) => `KSh ${n.toLocaleString()}`;
  const date = (d: Date) => new Date(d).toLocaleDateString('en-KE', { year: 'numeric', month: 'short', day: 'numeric' });

  return `<!doctype html><html><head><meta charset="utf-8"><title>${invoice.number}</title>
<style>
  body { font-family: ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, sans-serif; color: #0F1923; padding: 40px; max-width: 800px; margin: 0 auto; }
  .header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 32px; padding-bottom: 16px; border-bottom: 2px solid #22C55E; }
  .brand { font-size: 28px; font-weight: bold; color: #22C55E; }
  .meta { text-align: right; color: #6B7280; font-size: 14px; }
  .pill { display: inline-block; padding: 2px 10px; border-radius: 999px; font-size: 12px; font-weight: 600; text-transform: uppercase; }
  .pill.draft { background: #E5E7EB; color: #374151; }
  .pill.sent  { background: #DBEAFE; color: #1E40AF; }
  .pill.paid  { background: #D1FAE5; color: #065F46; }
  .pill.overdue { background: #FEE2E2; color: #991B1B; }
  .pill.void  { background: #F3F4F6; color: #6B7280; }
  .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 24px; margin-bottom: 24px; }
  .box { padding: 16px; background: #F9FAFB; border-radius: 8px; }
  .label { font-size: 11px; text-transform: uppercase; letter-spacing: 1px; color: #6B7280; margin-bottom: 6px; }
  table { width: 100%; border-collapse: collapse; margin-top: 16px; }
  th, td { padding: 10px 12px; text-align: left; border-bottom: 1px solid #E5E7EB; font-size: 14px; }
  th { background: #F3F4F6; font-weight: 600; }
  td.r, th.r { text-align: right; }
  .totals { margin-top: 16px; display: flex; justify-content: flex-end; }
  .totals table { width: 360px; }
  .totals .grand td { border-top: 2px solid #22C55E; font-weight: bold; font-size: 16px; }
  .notes { margin-top: 32px; padding: 16px; background: #F9FAFB; border-left: 3px solid #22C55E; font-size: 13px; }
  .footer { margin-top: 48px; padding-top: 16px; border-top: 1px solid #E5E7EB; text-align: center; color: #9CA3AF; font-size: 12px; }
  @media print { body { padding: 0; } }
</style>
</head><body>
  <div class="header">
    <div>
      <div class="brand">KAPASH</div>
      <div style="color:#6B7280;font-size:14px;margin-top:4px">Football pitch booking platform · Nairobi, Kenya</div>
    </div>
    <div class="meta">
      <div style="font-size:20px;color:#0F1923;font-weight:bold">INVOICE</div>
      <div style="margin-top:4px">${invoice.number}</div>
      <div style="margin-top:8px"><span class="pill ${invoice.status.toLowerCase()}">${invoice.status}</span></div>
    </div>
  </div>

  <div class="grid">
    <div class="box">
      <div class="label">Bill to</div>
      <div style="font-size:16px;font-weight:600">${invoice.corporate.name}</div>
      ${invoice.corporate.tradingName ? `<div style="color:#6B7280;font-size:13px">${invoice.corporate.tradingName}</div>` : ''}
      <div style="margin-top:8px;font-size:13px;color:#374151;white-space:pre-line">${invoice.corporate.billingAddress}</div>
      <div style="margin-top:8px;font-size:13px;color:#6B7280">${invoice.corporate.email} · ${invoice.corporate.phone}</div>
      ${invoice.corporate.kraPin ? `<div style="font-size:13px;color:#6B7280">KRA PIN: ${invoice.corporate.kraPin}</div>` : ''}
    </div>
    <div class="box">
      <div class="label">Details</div>
      <table style="margin-top:0">
        <tr><td style="padding:4px 0;border:0;color:#6B7280">Issued</td><td style="padding:4px 0;border:0" class="r">${date(invoice.issuedAt)}</td></tr>
        <tr><td style="padding:4px 0;border:0;color:#6B7280">Due</td><td style="padding:4px 0;border:0" class="r">${date(invoice.dueDate)}</td></tr>
        ${invoice.paidAt ? `<tr><td style="padding:4px 0;border:0;color:#6B7280">Paid</td><td style="padding:4px 0;border:0" class="r">${date(invoice.paidAt)}</td></tr>` : ''}
        ${invoice.paymentRef ? `<tr><td style="padding:4px 0;border:0;color:#6B7280">Ref</td><td style="padding:4px 0;border:0;font-family:monospace" class="r">${invoice.paymentRef}</td></tr>` : ''}
        ${invoice.event ? `<tr><td style="padding:4px 0;border:0;color:#6B7280">Event</td><td style="padding:4px 0;border:0" class="r">${invoice.event.name}</td></tr>` : ''}
      </table>
    </div>
  </div>

  <table>
    <thead>
      <tr><th>Description</th><th class="r">Qty</th><th class="r">Unit price</th><th class="r">Amount</th></tr>
    </thead>
    <tbody>
      ${items.map(it => `<tr><td>${it.description}</td><td class="r">${it.qty}</td><td class="r">${ksh(it.unitPrice)}</td><td class="r">${ksh(it.total)}</td></tr>`).join('')}
    </tbody>
  </table>

  <div class="totals">
    <table>
      <tr><td style="color:#6B7280">Subtotal</td><td class="r">${ksh(invoice.amount)}</td></tr>
      ${invoice.tax > 0 ? `<tr><td style="color:#6B7280">VAT</td><td class="r">${ksh(invoice.tax)}</td></tr>` : ''}
      <tr class="grand"><td>Total due</td><td class="r">${ksh(invoice.total)}</td></tr>
    </table>
  </div>

  ${invoice.notes ? `<div class="notes">${invoice.notes}</div>` : ''}

  <div class="footer">
    Pay via M-Pesa Paybill or bank transfer. Send proof to finance@kapash.app once paid. Thank you for booking with KAPASH.
  </div>
  <script>window.onload = () => window.focus();</script>
</body></html>`;
}
