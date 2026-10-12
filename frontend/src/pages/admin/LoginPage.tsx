import { useState, type FormEvent } from 'react';
import { Link, Navigate, useLocation } from 'react-router';
import { Eye, EyeOff, Lock, ShieldCheck } from 'lucide-react';
import { LogoBadge } from '@/components/brand/Logo';
import { Button } from '@/components/ui/Button';
import { TextField } from '@/components/ui/Field';
import { Alert, PageLoader } from '@/components/ui/States';
import { ThemeToggle } from '@/components/layout/ThemeToggle';
import { useAuth } from '@/features/admin/AuthProvider';
import { useDocumentMeta } from '@/hooks/useDocumentMeta';
import { ROLE_LABELS } from '@/lib/labels';
import type { StaffRole } from '@/types';

export function LoginPage() {
  const { status, notice, signIn, sendPasswordReset, previewSignIn } = useAuth();
  const location = useLocation();
  const from = (location.state as { from?: string } | null)?.from ?? '/admin';
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  useDocumentMeta({ title: 'Admin Login', noIndex: true });

  if (status === 'signedIn') return <Navigate to={from.startsWith('/admin') ? from : '/admin'} replace />;

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setInfo(null);
    if (!email || !password) {
      setError('Enter your email and password.');
      return;
    }
    setSubmitting(true);
    try {
      await signIn(email.trim(), password);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSubmitting(false);
    }
  };

  const onForgot = async () => {
    setError(null);
    setInfo(null);
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email.trim())) {
      setError('Enter your email address above, then choose "Forgot password?" again.');
      return;
    }
    try {
      await sendPasswordReset(email.trim());
      setInfo('If this email belongs to a staff account, a password reset link has been sent.');
    } catch (err) {
      setError((err as Error).message);
    }
  };

  return (
    <div className="relative isolate flex min-h-dvh items-center justify-center overflow-hidden bg-ink-950 px-4 py-10">
      <img src="/images/goddel-hero-1600.jpg" alt="" className="absolute inset-0 -z-10 h-full w-full object-cover object-[70%_center] opacity-30" />
      <div aria-hidden className="absolute inset-0 -z-10 bg-gradient-to-b from-ink-950/70 via-ink-950/85 to-ink-950" />
      <div className="absolute right-3 top-3 text-white [&_button]:text-white/80 [&_button:hover]:bg-white/10">
        <ThemeToggle />
      </div>

      <div className="w-full max-w-md">
        <div className="mb-6 flex justify-center text-white">
          <LogoBadge className="h-24 w-auto" />
        </div>
        <div className="card p-6 sm:p-8">
          <h1 className="text-center text-2xl font-bold">Admin Login</h1>
          <p className="mt-1 text-center text-sm text-muted">Sign in to access the dealership dashboard.</p>

          {status === 'loading' ? (
            <PageLoader label="Checking your session" />
          ) : status === 'notConfigured' ? (
            <Alert tone="warning" className="mt-6">
              Staff sign-in isn't configured yet. Add the <code>VITE_FIREBASE_*</code> variables to <code>frontend/.env</code> (see the README) and restart the
              site.
            </Alert>
          ) : (
            <>
              {notice && (
                <Alert tone="warning" className="mt-6">
                  {notice}
                </Alert>
              )}
              {error && (
                <Alert tone="error" className="mt-6">
                  {error}
                </Alert>
              )}
              {info && (
                <Alert tone="success" className="mt-6">
                  {info}
                </Alert>
              )}

              {previewSignIn ? (
                <div className="mt-6 space-y-3">
                  <Alert tone="info">Development preview: choose a role to explore the dashboard with sample data. Real sign-in uses Firebase.</Alert>
                  {(Object.keys(ROLE_LABELS) as StaffRole[]).map((role) => (
                    <Button key={role} variant={role === 'owner' ? 'primary' : 'outline'} className="w-full" onClick={() => previewSignIn(role)}>
                      Preview as {ROLE_LABELS[role]}
                    </Button>
                  ))}
                </div>
              ) : (
                <form onSubmit={onSubmit} className="mt-6 space-y-4" noValidate>
                  <TextField label="Email address" type="email" autoComplete="username" value={email} onChange={(e) => setEmail(e.target.value)} required />
                  <div>
                    <label htmlFor="admin-password" className="field-label">
                      Password
                    </label>
                    <div className="relative">
                      <input
                        id="admin-password"
                        type={showPassword ? 'text' : 'password'}
                        autoComplete="current-password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="field-input pr-12"
                        required
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword((s) => !s)}
                        className="absolute right-1 top-1/2 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-lg text-muted hover:text-fg"
                        aria-label={showPassword ? 'Hide password' : 'Show password'}
                      >
                        {showPassword ? <EyeOff className="h-5 w-5" aria-hidden /> : <Eye className="h-5 w-5" aria-hidden />}
                      </button>
                    </div>
                  </div>
                  <Button type="submit" size="lg" className="w-full" loading={submitting} leftIcon={<Lock className="h-4 w-4" aria-hidden />}>
                    Sign in
                  </Button>
                  <button type="button" onClick={onForgot} className="mx-auto block min-h-10 text-sm font-semibold text-brand-600 hover:underline dark:text-brand-400">
                    Forgot password?
                  </button>
                </form>
              )}
            </>
          )}
          <p className="mt-6 flex items-center justify-center gap-1.5 text-xs text-muted">
            <ShieldCheck className="h-4 w-4" aria-hidden /> Authorised staff only. Access is by invitation.
          </p>
        </div>
        <p className="mt-6 text-center text-sm">
          <Link to="/" className="font-semibold text-white/70 hover:text-white">
            ← Back to website
          </Link>
        </p>
      </div>
    </div>
  );
}
