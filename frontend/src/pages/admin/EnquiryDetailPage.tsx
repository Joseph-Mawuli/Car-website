import { useState, type FormEvent } from 'react';
import { Link, useParams } from 'react-router';
import { ChevronLeft, ExternalLink, Mail, MessageSquarePlus, Phone } from 'lucide-react';
import { adminApi } from '@/features/admin/api';
import { useAuth } from '@/features/admin/AuthProvider';
import { EnquiryStatusBadge } from '@/components/ui/Badge';
import { AnchorButton, Button } from '@/components/ui/Button';
import { SelectField } from '@/components/ui/Field';
import { ErrorState, PageLoader } from '@/components/ui/States';
import { useToast } from '@/components/ui/Toast';
import { WhatsAppIcon } from '@/components/icons/WhatsAppIcon';
import { useQuery } from '@/hooks/useQuery';
import { errorMessage } from '@/lib/api';
import { buildMailtoLink, buildTelLink, buildWhatsAppLink } from '@/lib/contact';
import { ENQUIRY_STATUS_LABELS, optionsFrom } from '@/lib/labels';
import { formatDate } from '@/lib/format';
import type { EnquiryStatus } from '@/types';

const CONTACT_LABEL = { whatsapp: 'WhatsApp', call: 'Phone call', email: 'Email' } as const;

export function EnquiryDetailPage() {
  const { id = '' } = useParams();
  const { can } = useAuth();
  const { notify } = useToast();
  const { data: enquiry, error, isLoading, reload, setData } = useQuery(`admin-enquiry:${id}`, (signal) => adminApi.getEnquiry(id, signal));
  const assignees = useQuery(can('enquiries:assign') ? 'assignees' : null, (signal) => adminApi.assignees(signal));
  const [note, setNote] = useState('');
  const [saving, setSaving] = useState<'status' | 'assign' | 'note' | null>(null);

  if (error) return <ErrorState error={error} title="Could not load this enquiry" onRetry={reload} />;
  if (isLoading || !enquiry) return <PageLoader />;

  const update = async (body: { status?: EnquiryStatus; assignedTo?: string | null }, kind: 'status' | 'assign') => {
    setSaving(kind);
    try {
      setData(await adminApi.updateEnquiry(enquiry.id, body));
      notify(kind === 'status' ? 'Status updated' : 'Assignment updated');
    } catch (err) {
      notify(errorMessage(err), 'error');
    } finally {
      setSaving(null);
    }
  };

  const addNote = async (e: FormEvent) => {
    e.preventDefault();
    if (!note.trim()) return;
    setSaving('note');
    try {
      setData(await adminApi.addEnquiryNote(enquiry.id, note.trim()));
      setNote('');
      notify('Note added');
    } catch (err) {
      notify(errorMessage(err), 'error');
    } finally {
      setSaving(null);
    }
  };

  const firstName = enquiry.name.split(' ')[0];
  const followUp = enquiry.vehicle
    ? `Hello ${firstName}, this is Goddel Motors following up on your enquiry about the ${enquiry.vehicle.title}.`
    : `Hello ${firstName}, this is Goddel Motors following up on your enquiry.`;

  return (
    <>
      <Link to="/admin/enquiries" className="mb-3 inline-flex min-h-9 items-center gap-1 text-sm font-semibold text-muted hover:text-fg">
        <ChevronLeft className="h-4 w-4" aria-hidden /> Enquiries
      </Link>
      <div className="mb-6 flex flex-wrap items-center gap-3">
        <h1 className="text-2xl font-bold sm:text-3xl">{enquiry.name}</h1>
        <EnquiryStatusBadge status={enquiry.status} />
      </div>

      <div className="grid gap-6 lg:grid-cols-[1.5fr_1fr]">
        <div className="space-y-6">
          <section className="card p-5 sm:p-6">
            <h2 className="font-semibold">Contact</h2>
            <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-2">
              <div>
                <dt className="text-muted">Phone</dt>
                <dd className="font-semibold">{enquiry.phone}</dd>
              </div>
              {enquiry.email && (
                <div>
                  <dt className="text-muted">Email</dt>
                  <dd className="break-all font-semibold">{enquiry.email}</dd>
                </div>
              )}
              {enquiry.preferredContact && (
                <div>
                  <dt className="text-muted">Prefers</dt>
                  <dd className="font-semibold">{CONTACT_LABEL[enquiry.preferredContact]}</dd>
                </div>
              )}
              <div>
                <dt className="text-muted">Received</dt>
                <dd className="font-semibold">{formatDate(enquiry.createdAt, { dateStyle: 'medium', timeStyle: 'short' })}</dd>
              </div>
            </dl>
            <div className="mt-5 grid gap-2 sm:grid-cols-3">
              <AnchorButton href={buildTelLink(enquiry.phone)} variant="outline">
                <Phone className="h-4 w-4" aria-hidden /> Call
              </AnchorButton>
              <AnchorButton href={buildWhatsAppLink(enquiry.phone, followUp)} target="_blank" rel="noopener noreferrer" variant="whatsapp">
                <WhatsAppIcon className="h-4 w-4" /> WhatsApp
              </AnchorButton>
              {enquiry.email && (
                <AnchorButton href={buildMailtoLink(enquiry.email, enquiry.vehicle ? `Your enquiry: ${enquiry.vehicle.title}` : 'Your enquiry')} variant="outline">
                  <Mail className="h-4 w-4" aria-hidden /> Email
                </AnchorButton>
              )}
            </div>
            <p className="mt-3 text-xs text-muted">WhatsApp links need the number in international format (e.g. +233…).</p>
          </section>

          <section className="card p-5 sm:p-6">
            <h2 className="font-semibold">Message</h2>
            {enquiry.vehicle && (
              <a href={`/cars/${enquiry.vehicle.slug}`} target="_blank" rel="noopener" className="mt-3 inline-flex items-center gap-1.5 text-sm font-semibold text-brand-600 hover:underline dark:text-brand-400">
                {enquiry.vehicle.title} <ExternalLink className="h-3.5 w-3.5" aria-hidden />
              </a>
            )}
            <p className="mt-3 whitespace-pre-line leading-relaxed text-fg-soft">{enquiry.message}</p>
          </section>

          <section className="card p-5 sm:p-6" aria-labelledby="notes-title">
            <h2 id="notes-title" className="font-semibold">
              Internal notes
            </h2>
            <p className="mt-1 text-xs text-muted">Only visible to staff.</p>
            {enquiry.notes.length > 0 ? (
              <ol className="mt-4 space-y-3">
                {enquiry.notes.map((n) => (
                  <li key={n.id} className="rounded-xl bg-surface-2 p-3">
                    <p className="whitespace-pre-line text-sm">{n.body}</p>
                    <p className="mt-1.5 text-xs text-muted">
                      {n.authorName} · {formatDate(n.createdAt, { dateStyle: 'medium', timeStyle: 'short' })}
                    </p>
                  </li>
                ))}
              </ol>
            ) : (
              <p className="mt-4 text-sm text-muted">No notes yet.</p>
            )}
            {can('enquiries:update') && (
              <form onSubmit={addNote} className="mt-4 space-y-2">
                <label htmlFor="new-note" className="sr-only">
                  Add a note
                </label>
                <textarea id="new-note" rows={3} value={note} onChange={(e) => setNote(e.target.value)} maxLength={2000} placeholder="e.g. Called — viewing booked for Saturday" className="field-input" />
                <Button type="submit" variant="secondary" loading={saving === 'note'} disabled={!note.trim()} leftIcon={<MessageSquarePlus className="h-4 w-4" aria-hidden />}>
                  Add note
                </Button>
              </form>
            )}
          </section>
        </div>

        <aside className="space-y-6 lg:sticky lg:top-8 lg:self-start">
          <section className="card space-y-4 p-5">
            <h2 className="font-semibold">Follow-up</h2>
            <SelectField
              label="Status"
              options={optionsFrom(ENQUIRY_STATUS_LABELS)}
              value={enquiry.status}
              disabled={!can('enquiries:update') || saving !== null}
              onChange={(e) => update({ status: e.target.value as EnquiryStatus }, 'status')}
            />
            {can('enquiries:assign') ? (
              <SelectField
                label="Assigned to"
                placeholder="Unassigned"
                options={(assignees.data ?? []).map((a) => ({ value: a.id, label: a.name }))}
                value={enquiry.assignedTo?.id ?? ''}
                disabled={saving !== null || !assignees.data}
                onChange={(e) => update({ assignedTo: e.target.value || null }, 'assign')}
              />
            ) : (
              <div>
                <p className="field-label">Assigned to</p>
                <p className="text-sm">{enquiry.assignedTo?.name ?? 'Unassigned'}</p>
              </div>
            )}
          </section>
        </aside>
      </div>
    </>
  );
}
