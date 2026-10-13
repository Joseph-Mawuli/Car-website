import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { CheckCircle2, Send } from 'lucide-react';
import { Link } from 'react-router';
import { enquiryFormSchema, type EnquiryFormValues } from './schema';
import { submitEnquiry } from './api';
import { Button } from '@/components/ui/Button';
import { Checkbox, TextAreaField, TextField } from '@/components/ui/Field';
import { Alert } from '@/components/ui/States';
import { ApiError, errorMessage } from '@/lib/api';
import { cn } from '@/lib/format';
import { useSettings } from '@/providers/SettingsProvider';

interface Props {
  vehicleId?: string;
  vehicleTitle?: string;
  defaultMessage?: string;
  className?: string;
}

const CONTACT_OPTIONS = [
  { value: 'whatsapp', label: 'WhatsApp' },
  { value: 'call', label: 'Phone call' },
  { value: 'email', label: 'Email' },
] as const;

export function EnquiryForm({ vehicleId, vehicleTitle, defaultMessage, className }: Props) {
  const { settings } = useSettings();
  const [startedAt, setStartedAt] = useState(() => Date.now());
  const [submittedId, setSubmittedId] = useState<string | null>(null);
  const [serverError, setServerError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    reset,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<EnquiryFormValues>({
    resolver: zodResolver(enquiryFormSchema),
    defaultValues: {
      name: '',
      phone: '',
      email: '',
      preferredContact: 'whatsapp',
      message: defaultMessage ?? (vehicleTitle ? `I'm interested in the ${vehicleTitle}. Is it still available?` : ''),
      consent: false,
      website: '',
    },
  });

  const onSubmit = async (values: EnquiryFormValues) => {
    setServerError(null);
    try {
      const res = await submitEnquiry({
        name: values.name,
        phone: values.phone,
        email: values.email || undefined,
        message: values.message,
        preferredContact: values.preferredContact,
        consent: values.consent,
        vehicleId,
        website: values.website,
        startedAt,
      });
      setSubmittedId(res.id);
      reset();
    } catch (err) {
      if (err instanceof ApiError && err.details) {
        for (const [field, messages] of Object.entries(err.details)) {
          if (field in values) setError(field as keyof EnquiryFormValues, { message: messages[0] });
        }
      }
      setServerError(
        err instanceof ApiError && err.status === 429
          ? 'You have sent several enquiries in a short time. Please wait a few minutes, or contact us by phone or WhatsApp.'
          : errorMessage(err),
      );
    }
  };

  if (submittedId) {
    return (
      <div className={cn('flex flex-col items-center rounded-2xl border border-emerald-500/30 bg-emerald-500/8 px-6 py-10 text-center', className)} role="status">
        <CheckCircle2 className="h-12 w-12 text-success" aria-hidden />
        <h3 className="mt-4 text-lg font-semibold">Thank you — your enquiry has been sent</h3>
        <p className="mt-2 max-w-sm text-sm text-muted">A member of our team will contact you using the details you provided.</p>
        <Button
          variant="outline"
          className="mt-6"
          onClick={() => {
            setStartedAt(Date.now());
            setSubmittedId(null);
          }}
        >
          Send another enquiry
        </Button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate className={cn('space-y-4', className)} aria-label={vehicleTitle ? `Enquire about ${vehicleTitle}` : 'Enquiry form'}>
      {serverError && <Alert tone="error">{serverError}</Alert>}
      <TextField label="Full name" autoComplete="name" required error={errors.name?.message} {...register('name')} />
      <div className="grid gap-4 sm:grid-cols-2">
        <TextField label="Phone / WhatsApp number" type="tel" inputMode="tel" autoComplete="tel" required error={errors.phone?.message} {...register('phone')} />
        <TextField label="Email (optional)" type="email" autoComplete="email" error={errors.email?.message} {...register('email')} />
      </div>
      <fieldset>
        <legend className="field-label">Preferred contact method</legend>
        <div className="grid grid-cols-3 gap-2">
          {CONTACT_OPTIONS.map((o) => (
            <label
              key={o.value}
              className="flex min-h-11 cursor-pointer items-center justify-center rounded-xl border border-line-strong px-2 text-center text-sm font-semibold text-fg-soft has-[:checked]:border-brand-500 has-[:checked]:bg-brand-500/10 has-[:checked]:text-brand-300 has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-brand-400"
            >
              <input type="radio" value={o.value} className="sr-only" {...register('preferredContact')} />
              {o.label}
            </label>
          ))}
        </div>
      </fieldset>
      <TextAreaField label="Message" required rows={4} error={errors.message?.message} {...register('message')} />

      <div aria-hidden className="absolute -left-[9999px] h-0 w-0 overflow-hidden">
        <label htmlFor="enquiry-website">Leave this field empty</label>
        <input id="enquiry-website" type="text" tabIndex={-1} autoComplete="off" {...register('website')} />
      </div>

      <Checkbox
        label={
          <>
            I agree that {settings.dealershipName} may use these details to respond to my enquiry, as described in the{' '}
            <Link to="/contact#privacy" className="font-semibold text-brand-500 underline hover:text-brand-300">
              privacy notice
            </Link>
            .
          </>
        }
        error={errors.consent?.message}
        {...register('consent')}
      />
      <Button type="submit" size="lg" className="w-full" loading={isSubmitting} leftIcon={<Send className="h-4 w-4" aria-hidden />}>
        {isSubmitting ? 'Sending…' : 'Send enquiry'}
      </Button>
    </form>
  );
}
