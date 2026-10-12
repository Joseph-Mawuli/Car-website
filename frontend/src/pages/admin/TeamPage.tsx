import { useState } from 'react';
import { useForm, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Copy, KeyRound, MailCheck, UserPlus, Users } from 'lucide-react';
import { adminApi } from '@/features/admin/api';
import { useAuth } from '@/features/admin/AuthProvider';
import { AdminPageHeader } from '@/layouts/AdminLayout';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { ConfirmDialog, Dialog } from '@/components/ui/Dialog';
import { SelectField, TextField } from '@/components/ui/Field';
import { Alert, EmptyState, ErrorState, PageLoader } from '@/components/ui/States';
import { useToast } from '@/components/ui/Toast';
import { useQuery } from '@/hooks/useQuery';
import { errorMessage } from '@/lib/api';
import { formatDate } from '@/lib/format';
import { ROLE_LABELS, optionsFrom } from '@/lib/labels';
import type { SetupLinkDelivery, StaffMember, StaffRole } from '@/types';

const ROLE_DESCRIPTIONS: Record<StaffRole, string> = {
  owner: 'Full access, including team, settings and the audit log.',
  inventory_manager: 'Adds and edits vehicles, photos, prices and availability.',
  sales_assistant: 'Handles enquiries: notes and follow-up status.',
};

const inviteSchema = z.object({
  displayName: z.string().trim().min(2, 'Enter their name.').max(80),
  email: z.email('Enter a valid email address.'),
  role: z.enum(['owner', 'inventory_manager', 'sales_assistant']),
});
type InviteValues = z.infer<typeof inviteSchema>;

interface DeliveryResult {
  email: string;
  delivery: SetupLinkDelivery;
}

export function DeliveryNotice({ email, delivery, onDone }: DeliveryResult & { onDone: () => void }) {
  const { notify } = useToast();
  const link = delivery.setupLink;

  if (delivery.emailed || !link) {
    return (
      <div className="space-y-4">
        <Alert tone="success">
          <span className="flex items-start gap-2">
            <MailCheck className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
            <span>
              We've emailed a password setup link to <strong>{email}</strong>.
              {delivery.method === 'firebase' && ' It comes from Firebase (a noreply address) with the subject “Reset your password”.'} Ask them to check their spam
              folder if it doesn't arrive within a few minutes.
            </span>
          </span>
        </Alert>
        <Button className="w-full sm:w-auto" onClick={onDone}>
          Done
        </Button>
      </div>
    );
  }

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(link);
      notify('Link copied');
    } catch {
      notify('Copy failed — select the link and copy it manually', 'error');
    }
  };
  return (
    <div className="space-y-4">
      <Alert tone={delivery.notice ? 'warning' : 'info'}>
        {delivery.notice ?? 'Email sending is not set up yet.'} Send this one-time password setup link to <strong>{email}</strong> privately (for example by
        WhatsApp). It expires after a short time and won't be shown again.
      </Alert>
      <label className="field-label" htmlFor="setup-link">
        Setup link
      </label>
      <textarea id="setup-link" readOnly rows={4} value={link} className="field-input font-mono text-xs" onFocus={(e) => e.currentTarget.select()} />
      <div className="flex flex-col gap-2 sm:flex-row">
        <Button onClick={copy} leftIcon={<Copy className="h-4 w-4" aria-hidden />}>
          Copy link
        </Button>
        <Button variant="outline" onClick={onDone}>
          Done
        </Button>
      </div>
    </div>
  );
}

function InviteDialog({ open, onClose, onInvited }: { open: boolean; onClose: () => void; onInvited: (s: StaffMember) => void }) {
  const [result, setResult] = useState<DeliveryResult | null>(null);
  const [serverError, setServerError] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    reset,
    control,
    formState: { errors, isSubmitting },
  } = useForm<InviteValues>({ resolver: zodResolver(inviteSchema), defaultValues: { displayName: '', email: '', role: 'sales_assistant' } });
  const role = useWatch({ control, name: 'role' });

  const close = () => {
    reset();
    setResult(null);
    setServerError(null);
    onClose();
  };

  const onSubmit = async (values: InviteValues) => {
    setServerError(null);
    try {
      const { staff, delivery } = await adminApi.inviteStaff(values);
      onInvited(staff);
      setResult({ email: staff.email, delivery });
    } catch (err) {
      setServerError(errorMessage(err));
    }
  };

  return (
    <Dialog open={open} onClose={close} title={result ? (result.delivery.emailed ? 'Invitation sent' : 'Invitation created') : 'Invite a team member'}>
      {result ? (
        <DeliveryNotice {...result} onDone={close} />
      ) : (
        <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-4">
          {serverError && <Alert tone="error">{serverError}</Alert>}
          <TextField label="Full name" required autoComplete="off" error={errors.displayName?.message} {...register('displayName')} />
          <TextField label="Email" type="email" required autoComplete="off" error={errors.email?.message} {...register('email')} />
          <SelectField label="Role" options={optionsFrom(ROLE_LABELS)} hint={ROLE_DESCRIPTIONS[role]} {...register('role')} />
          <Button type="submit" className="w-full" loading={isSubmitting} leftIcon={<UserPlus className="h-4 w-4" aria-hidden />}>
            Create invitation
          </Button>
        </form>
      )}
    </Dialog>
  );
}

export function TeamPage() {
  const { staff: me } = useAuth();
  const { notify } = useToast();
  const { data, error, isLoading, reload, setData } = useQuery('admin-staff', (signal) => adminApi.listStaff(signal));
  const [inviteOpen, setInviteOpen] = useState(false);
  const [confirm, setConfirm] = useState<StaffMember | null>(null);
  const [resent, setResent] = useState<DeliveryResult | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const replace = (updated: StaffMember) => setData((prev) => (prev ?? []).map((s) => (s.id === updated.id ? updated : s)));

  const update = async (member: StaffMember, body: { role?: StaffRole; status?: 'active' | 'disabled' }) => {
    setBusyId(member.id);
    try {
      replace(await adminApi.updateStaff(member.id, body));
      notify(body.status === 'disabled' ? `${member.displayName} can no longer sign in` : 'Team member updated');
    } catch (err) {
      notify(errorMessage(err), 'error');
    } finally {
      setBusyId(null);
    }
  };

  const newLink = async (member: StaffMember) => {
    setBusyId(member.id);
    try {
      setResent(await adminApi.staffSetupLink(member.id));
    } catch (err) {
      notify(errorMessage(err), 'error');
    } finally {
      setBusyId(null);
    }
  };

  return (
    <>
      <AdminPageHeader
        title="Team"
        description="Invite staff and control what they can access. Disabling someone signs them out everywhere."
        actions={
          <Button onClick={() => setInviteOpen(true)} leftIcon={<UserPlus className="h-4 w-4" aria-hidden />}>
            Invite
          </Button>
        }
      />

      {error ? (
        <ErrorState error={error} onRetry={reload} title="Could not load the team" />
      ) : isLoading || !data ? (
        <PageLoader />
      ) : data.length === 0 ? (
        <EmptyState icon={<Users className="h-7 w-7" aria-hidden />} title="No team members yet" />
      ) : (
        <ul className="space-y-3">
          {data.map((m) => {
            const isMe = m.id === me?.id;
            return (
              <li key={m.id} className="card flex flex-col gap-4 p-4 sm:p-5 lg:flex-row lg:items-center">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-semibold">{m.displayName}</p>
                    {isMe && <Badge tone="blue">You</Badge>}
                    {m.status === 'disabled' && <Badge tone="red">Disabled</Badge>}
                  </div>
                  <p className="truncate text-sm text-muted">{m.email}</p>
                  <p className="mt-1 text-xs text-muted">{m.lastLoginAt ? `Last sign-in ${formatDate(m.lastLoginAt)}` : 'Has not signed in yet'}</p>
                </div>
                <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
                  <SelectField
                    label="Role"
                    hideLabel
                    wrapperClassName="sm:w-52"
                    options={optionsFrom(ROLE_LABELS)}
                    value={m.role}
                    disabled={isMe || busyId === m.id}
                    onChange={(e) => update(m, { role: e.target.value as StaffRole })}
                  />
                  {!isMe && (
                    <>
                      {m.status === 'active' && !m.lastLoginAt && (
                        <Button variant="outline" loading={busyId === m.id} onClick={() => newLink(m)} leftIcon={<KeyRound className="h-4 w-4" aria-hidden />}>
                          Resend invite
                        </Button>
                      )}
                      {m.status === 'active' ? (
                        <Button variant="outline" className="text-danger" disabled={busyId === m.id} onClick={() => setConfirm(m)}>
                          Disable
                        </Button>
                      ) : (
                        <Button variant="outline" loading={busyId === m.id} onClick={() => update(m, { status: 'active' })}>
                          Re-enable
                        </Button>
                      )}
                    </>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      )}

      <InviteDialog open={inviteOpen} onClose={() => setInviteOpen(false)} onInvited={(s) => setData((prev) => [...(prev ?? []), s])} />

      <Dialog open={resent !== null} onClose={() => setResent(null)} title={resent?.delivery.emailed ? 'Invitation re-sent' : 'New setup link'}>
        {resent && <DeliveryNotice {...resent} onDone={() => setResent(null)} />}
      </Dialog>

      <ConfirmDialog
        open={confirm !== null}
        onCancel={() => setConfirm(null)}
        title={`Disable ${confirm?.displayName ?? 'this account'}?`}
        description="They will be signed out and blocked from the admin area immediately. You can re-enable them later."
        confirmLabel="Disable account"
        tone="danger"
        loading={confirm !== null && busyId === confirm.id}
        onConfirm={async () => {
          if (confirm) await update(confirm, { status: 'disabled' });
          setConfirm(null);
        }}
      />
    </>
  );
}
