import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ShieldCheck } from 'lucide-react';
import { useAuth } from '../auth/AuthContext';
import { errorMessage } from '../api/client';

export function LoginPage() {
  const { sendOtp, loginWithOtp, loginWithDev } = useAuth();
  const nav = useNavigate();

  const [phone, setPhone] = useState('+254');
  const [otp, setOtp] = useState('');
  const [step, setStep] = useState<'phone' | 'otp'>('phone');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');

  const handleSendOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setErr('');
    if (!/^\+254\d{9}$/.test(phone)) return setErr('Phone must be +254XXXXXXXXX');
    setBusy(true);
    try {
      await sendOtp(phone);
      setStep('otp');
    } catch (e) { setErr(errorMessage(e)); }
    finally { setBusy(false); }
  };

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    setErr('');
    if (otp.length !== 6) return setErr('OTP must be 6 digits');
    setBusy(true);
    try {
      await loginWithOtp(phone, otp);
      nav('/', { replace: true });
    } catch (e) { setErr(errorMessage(e)); }
    finally { setBusy(false); }
  };

  const handleDev = async () => {
    setErr('');
    setBusy(true);
    try {
      await loginWithDev('ADMIN');
      nav('/', { replace: true });
    } catch (e) { setErr(errorMessage(e)); }
    finally { setBusy(false); }
  };

  return (
    <div className="h-full flex items-center justify-center p-4 bg-[hsl(var(--muted))]">
      <div className="card w-full max-w-md p-8">
        <div className="flex flex-col items-center text-center mb-6">
          <div className="w-12 h-12 rounded-xl bg-brand flex items-center justify-center mb-3">
            <ShieldCheck className="w-6 h-6 text-white" />
          </div>
          <h1 className="text-xl font-bold">KAPASH admin</h1>
          <p className="text-sm text-[hsl(var(--muted-fg))] mt-1">Sign in with your registered admin phone</p>
        </div>

        {step === 'phone' ? (
          <form onSubmit={handleSendOtp} className="space-y-3">
            <div>
              <label className="label">Phone number</label>
              <input
                className="input mt-1"
                value={phone}
                onChange={e => setPhone(e.target.value.trim())}
                placeholder="+254700000000"
                autoFocus
              />
            </div>
            {err && <p className="text-sm text-red-500">{err}</p>}
            <button type="submit" className="btn-primary w-full" disabled={busy}>
              {busy ? 'Sending OTP…' : 'Send OTP'}
            </button>
          </form>
        ) : (
          <form onSubmit={handleVerify} className="space-y-3">
            <div>
              <label className="label">OTP code</label>
              <input
                className="input mt-1 text-center tracking-[0.5em] font-mono text-lg"
                value={otp}
                onChange={e => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                placeholder="000000"
                autoFocus
                inputMode="numeric"
              />
              <p className="text-xs text-[hsl(var(--muted-fg))] mt-1">Sent to {phone}</p>
            </div>
            {err && <p className="text-sm text-red-500">{err}</p>}
            <button type="submit" className="btn-primary w-full" disabled={busy}>
              {busy ? 'Verifying…' : 'Verify & sign in'}
            </button>
            <button
              type="button"
              className="btn-ghost w-full"
              onClick={() => { setStep('phone'); setOtp(''); }}
              disabled={busy}
            >
              Change phone
            </button>
          </form>
        )}

        {import.meta.env.DEV && (
          <div className="mt-6 pt-6 border-t border-[hsl(var(--border))]">
            <p className="text-xs text-center text-[hsl(var(--muted-fg))] mb-2">Dev only</p>
            <button onClick={handleDev} className="btn-outline w-full" disabled={busy}>
              Use dev admin login
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
