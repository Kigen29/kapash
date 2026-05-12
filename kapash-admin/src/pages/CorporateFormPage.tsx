import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, Save } from 'lucide-react';
import { ADMIN } from '../api/admin';
import { errorMessage } from '../api/client';

export function CorporateFormPage() {
  const { id } = useParams<{ id?: string }>();
  const isEdit = !!id;
  const nav = useNavigate();
  const qc = useQueryClient();

  const existing = useQuery({
    queryKey: ['admin', 'corporate', id],
    queryFn: () => ADMIN.corporates.get(id!),
    enabled: isEdit,
  });

  const [form, setForm] = useState({
    name: '', tradingName: '', email: '', phone: '+254',
    billingAddress: '', kraPin: '',
    creditLimit: 0, paymentTermDays: 7,
  });
  const [err, setErr] = useState('');

  useEffect(() => {
    if (existing.data) {
      setForm({
        name: existing.data.name,
        tradingName: existing.data.tradingName || '',
        email: existing.data.email,
        phone: existing.data.phone,
        billingAddress: existing.data.billingAddress,
        kraPin: existing.data.kraPin || '',
        creditLimit: existing.data.creditLimit,
        paymentTermDays: existing.data.paymentTermDays,
      });
    }
  }, [existing.data]);

  const create = useMutation({
    mutationFn: () => ADMIN.corporates.create(form as any),
    onSuccess: (c: any) => {
      qc.invalidateQueries({ queryKey: ['admin', 'corporates'] });
      nav(`/corporates/${c.id}`);
    },
    onError: e => setErr(errorMessage(e)),
  });

  const update = useMutation({
    mutationFn: () => ADMIN.corporates.update(id!, form as any),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin', 'corporates'] });
      qc.invalidateQueries({ queryKey: ['admin', 'corporate', id] });
      nav(`/corporates/${id}`);
    },
    onError: e => setErr(errorMessage(e)),
  });

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    setErr('');
    if (!/^\+254\d{9}$/.test(form.phone)) return setErr('Phone must be +254XXXXXXXXX.');
    if (isEdit) update.mutate(); else create.mutate();
  };

  const busy = create.isPending || update.isPending;

  return (
    <div className="space-y-6 max-w-2xl">
      <Link to={isEdit ? `/corporates/${id}` : '/corporates'} className="btn-ghost btn-sm w-fit"><ArrowLeft className="w-4 h-4" />Back</Link>
      <div>
        <h1 className="text-2xl font-bold">{isEdit ? 'Edit corporate' : 'New corporate'}</h1>
      </div>
      <form onSubmit={submit} className="card p-6 space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div><label className="label">Company name</label><input className="input mt-1" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} required minLength={2} maxLength={120} /></div>
          <div><label className="label">Trading name</label><input className="input mt-1" value={form.tradingName} onChange={e => setForm({ ...form, tradingName: e.target.value })} maxLength={120} /></div>
          <div><label className="label">Email</label><input className="input mt-1" type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} required /></div>
          <div><label className="label">Phone</label><input className="input mt-1" value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value.trim() })} pattern="\+254\d{9}" required /></div>
          <div className="md:col-span-2"><label className="label">Billing address</label><textarea className="textarea mt-1 min-h-[80px]" value={form.billingAddress} onChange={e => setForm({ ...form, billingAddress: e.target.value })} required maxLength={500} /></div>
          <div><label className="label">KRA PIN</label><input className="input mt-1" value={form.kraPin} onChange={e => setForm({ ...form, kraPin: e.target.value })} maxLength={20} placeholder="P000000000A" /></div>
          <div><label className="label">Credit limit (KSh)</label><input className="input mt-1" type="number" min="0" value={form.creditLimit} onChange={e => setForm({ ...form, creditLimit: Number(e.target.value) })} /></div>
          <div><label className="label">Payment terms (days)</label><input className="input mt-1" type="number" min="0" max="90" value={form.paymentTermDays} onChange={e => setForm({ ...form, paymentTermDays: Number(e.target.value) })} /></div>
        </div>
        {err && <div className="text-sm text-red-500">{err}</div>}
        <div className="flex justify-end gap-2 pt-2">
          <Link to={isEdit ? `/corporates/${id}` : '/corporates'} className="btn-ghost">Cancel</Link>
          <button type="submit" className="btn-primary" disabled={busy}><Save className="w-4 h-4" />{busy ? 'Saving…' : 'Save'}</button>
        </div>
      </form>
    </div>
  );
}
