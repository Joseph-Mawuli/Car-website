import { useState, type ReactNode } from 'react';
import { useFieldArray, useForm, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Plus, Save, Trash2 } from 'lucide-react';
import { adminApi } from '@/features/admin/api';
import { AdminPageHeader } from '@/layouts/AdminLayout';
import { Button } from '@/components/ui/Button';
import { SelectField, TextAreaField, TextField } from '@/components/ui/Field';
import { Alert, ErrorState, PageLoader } from '@/components/ui/States';
import { useToast } from '@/components/ui/Toast';
import { useQuery } from '@/hooks/useQuery';
import { ApiError, errorMessage } from '@/lib/api';
import { formatDate } from '@/lib/format';
import { CURRENCIES, CURRENCY_NAMES, type AdminSettings, type CurrencyCode } from '@/types';

const optionalHttps = z.string().trim().refine((v) => v === '' || /^https:\/\/\S+$/i.test(v), 'Links must start with https://');

const schema = z
  .object({
    dealershipName: z.string().trim().min(1, 'Required.').max(80),
    tagline: z.string().trim().max(200),
    phone: z.string().trim().refine((v) => v === '' || /^\+?[\d\s()-]{7,20}$/.test(v), 'Enter a valid phone number.'),
    whatsapp: z.string().trim().refine((v) => v === '' || /^\+?[\d\s]{8,20}$/.test(v), 'Use international format, e.g. +233 24 123 4567.'),
    email: z.union([z.literal(''), z.email('Enter a valid email.')]),
    address: z.string().trim().max(300),
    mapUrl: optionalHttps,
    openingHours: z.array(z.object({ label: z.string().trim().min(1, 'Required.').max(40), hours: z.string().trim().min(1, 'Required.').max(80) })).max(10),
    socialLinks: z.array(z.object({ label: z.string().trim().min(1, 'Required.').max(30), url: optionalHttps.refine((v) => v !== '', 'Required.') })).max(10),
    defaultCurrency: z.enum(CURRENCIES),
    supportedCurrencies: z.array(z.enum(CURRENCIES)).min(1, 'Choose at least one currency.'),
    exchangeRateMode: z.enum(['live', 'manual']),
    /** Entered as "1 {foreign} = X {default}", which is how dealers usually quote rates. */
    ratesPerForeign: z.record(z.string(), z.string().refine((v) => v === '' || (/^\d+(\.\d+)?$/.test(v) && Number(v) > 0), 'Enter a positive number.')),
    rateSource: z.string().trim().max(120),
    aboutHeading: z.string().trim().max(120),
    aboutBody: z.string().trim().max(4000),
    whyChooseUs: z.array(z.object({ title: z.string().trim().min(1, 'Required.').max(60), body: z.string().trim().min(1, 'Required.').max(300) })).max(6),
    privacyNotice: z.string().trim().max(4000),
  })
  .refine((v) => v.supportedCurrencies.includes(v.defaultCurrency), {
    message: 'The default currency must be one of the supported currencies.',
    path: ['supportedCurrencies'],
  });
type Values = z.infer<typeof schema>;

function toValues(s: AdminSettings): Values {
  const ratesPerForeign: Record<string, string> = {};
  for (const code of CURRENCIES) {
    const r = s.exchangeRates?.base === s.defaultCurrency ? s.exchangeRates.rates[code] : undefined;
    ratesPerForeign[code] = r ? String(Number((1 / r).toPrecision(6))) : '';
  }
  return {
    dealershipName: s.dealershipName,
    tagline: s.tagline ?? '',
    phone: s.phone ?? '',
    whatsapp: s.whatsapp ?? '',
    email: s.email ?? '',
    address: s.address ?? '',
    mapUrl: s.mapUrl ?? '',
    openingHours: s.openingHours,
    socialLinks: s.socialLinks,
    defaultCurrency: s.defaultCurrency,
    supportedCurrencies: s.supportedCurrencies,
    exchangeRateMode: s.exchangeRateMode ?? 'live',
    ratesPerForeign,
    rateSource: s.exchangeRates?.source ?? '',
    aboutHeading: s.aboutHeading ?? '',
    aboutBody: s.aboutBody ?? '',
    whyChooseUs: s.whyChooseUs,
    privacyNotice: s.privacyNotice ?? '',
  };
}

function toPayload(v: Values): Record<string, unknown> {
  const { ratesPerForeign, rateSource, ...rest } = v;
  const rates: Partial<Record<CurrencyCode, number>> = {};
  for (const code of v.supportedCurrencies) {
    const per = ratesPerForeign[code];
    if (code !== v.defaultCurrency && per) rates[code] = 1 / Number(per);
  }
  return {
    ...rest,
    exchangeRates: Object.keys(rates).length ? { rates, source: rateSource || undefined } : undefined,
  };
}

function Section({ title, description, children }: { title: string; description?: ReactNode; children: ReactNode }) {
  return (
    <section className="card p-5 sm:p-6">
      <h2 className="text-lg font-semibold">{title}</h2>
      {description && <p className="mt-1 text-sm text-muted">{description}</p>}
      <div className="mt-5 space-y-4">{children}</div>
    </section>
  );
}

export function SettingsPage() {
  const { data, error, isLoading, reload, setData } = useQuery('admin-settings', (signal) => adminApi.getSettings(signal));
  if (error) return <ErrorState error={error} onRetry={reload} title="Could not load settings" />;
  if (isLoading || !data) return <PageLoader />;
  return <SettingsForm key={data.updatedAt ?? 'initial'} settings={data} onSaved={setData} />;
}

function SettingsForm({ settings, onSaved }: { settings: AdminSettings; onSaved: (s: AdminSettings) => void }) {
  const { notify } = useToast();
  const [serverError, setServerError] = useState<string | null>(null);
  const {
    register,
    control,
    handleSubmit,
    formState: { errors, isSubmitting, isDirty },
  } = useForm<Values>({ resolver: zodResolver(schema), defaultValues: toValues(settings) });
  const hours = useFieldArray({ control, name: 'openingHours' });
  const social = useFieldArray({ control, name: 'socialLinks' });
  const why = useFieldArray({ control, name: 'whyChooseUs' });
  const defaultCurrency = useWatch({ control, name: 'defaultCurrency' });
  const supported = useWatch({ control, name: 'supportedCurrencies' }) ?? [];
  const foreign = supported.filter((c) => c !== defaultCurrency);
  const rateMode = useWatch({ control, name: 'exchangeRateMode' });
  const live = settings.liveExchangeRates?.base === defaultCurrency ? settings.liveExchangeRates : undefined;

  const onSubmit = async (values: Values) => {
    setServerError(null);
    try {
      onSaved(await adminApi.updateSettings(toPayload(values)));
      notify('Settings saved');
    } catch (err) {
      setServerError(err instanceof ApiError && err.details ? `${errorMessage(err)} ${Object.values(err.details).flat().join(' ')}` : errorMessage(err));
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate>
      <AdminPageHeader
        title="Settings"
        description="Business details shown across the public website."
        actions={
          <Button type="submit" loading={isSubmitting} disabled={!isDirty} leftIcon={<Save className="h-4 w-4" aria-hidden />} className="hidden sm:inline-flex">
            Save settings
          </Button>
        }
      />
      {serverError && (
        <Alert tone="error" className="mb-5">
          {serverError}
        </Alert>
      )}

      <div className="space-y-5">
        <Section title="Business & contact" description="Leave a field blank to hide it on the website.">
          <div className="grid gap-4 sm:grid-cols-2">
            <TextField label="Dealership name" required error={errors.dealershipName?.message} {...register('dealershipName')} />
            <TextField label="Tagline" error={errors.tagline?.message} {...register('tagline')} />
            <TextField label="Phone" type="tel" placeholder="+233 …" error={errors.phone?.message} {...register('phone')} />
            <TextField label="WhatsApp number" type="tel" placeholder="+233 …" hint="International format, used for WhatsApp links." error={errors.whatsapp?.message} {...register('whatsapp')} />
            <TextField label="Email" type="email" error={errors.email?.message} {...register('email')} />
            <TextField label="Google Maps link" placeholder="https://maps.google.com/…" error={errors.mapUrl?.message} {...register('mapUrl')} />
          </div>
          <TextAreaField label="Address" rows={2} error={errors.address?.message} {...register('address')} />
        </Section>

        <Section title="Opening hours">
          {hours.fields.map((f, i) => (
            <div key={f.id} className="grid grid-cols-[1fr_1.4fr_auto] items-start gap-2">
              <TextField label="Days" hideLabel={i > 0} placeholder="Mon – Fri" error={errors.openingHours?.[i]?.label?.message} {...register(`openingHours.${i}.label`)} />
              <TextField label="Hours" hideLabel={i > 0} placeholder="8:00 – 18:00" error={errors.openingHours?.[i]?.hours?.message} {...register(`openingHours.${i}.hours`)} />
              <Button variant="ghost" size="icon" aria-label={`Remove row ${i + 1}`} onClick={() => hours.remove(i)} className={i === 0 ? 'mt-7' : undefined}>
                <Trash2 className="h-4 w-4" aria-hidden />
              </Button>
            </div>
          ))}
          {hours.fields.length < 10 && (
            <Button variant="outline" size="sm" onClick={() => hours.append({ label: '', hours: '' })} leftIcon={<Plus className="h-4 w-4" aria-hidden />}>
              Add row
            </Button>
          )}
        </Section>

        <Section
          title="Currency"
          description="Each vehicle keeps the price and currency you enter. Visitors can switch the site to another currency and see a converted price, clearly labelled as an estimate with the rate date."
        >
          <SelectField label="Default currency" options={CURRENCIES.map((c) => ({ value: c, label: `${c} — ${CURRENCY_NAMES[c]}` }))} {...register('defaultCurrency')} />
          <fieldset>
            <legend className="field-label">Currencies visitors can switch to</legend>
            <div className="flex flex-wrap gap-4">
              {CURRENCIES.map((c) => (
                <label key={c} className="flex min-h-11 cursor-pointer items-center gap-2 text-sm font-semibold">
                  <input type="checkbox" value={c} className="h-5 w-5 accent-brand-500" {...register('supportedCurrencies')} />
                  <span title={CURRENCY_NAMES[c]}>{c}</span>
                </label>
              ))}
            </div>
            {errors.supportedCurrencies && <p className="field-error">{errors.supportedCurrencies.message ?? errors.supportedCurrencies.root?.message}</p>}
          </fieldset>
          {foreign.length > 0 && (
            <fieldset>
              <legend className="field-label">Exchange rates</legend>
              <div className="space-y-2">
                <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-line p-3 has-[:checked]:border-brand-500 has-[:checked]:bg-brand-500/5">
                  <input type="radio" value="live" className="mt-0.5 h-5 w-5 accent-brand-500" {...register('exchangeRateMode')} />
                  <span className="text-sm">
                    <span className="block font-semibold">Live market rates (recommended)</span>
                    <span className="text-muted">Updated automatically once a day from ExchangeRate-API. If they can't be fetched, your own rates below are used.</span>
                  </span>
                </label>
                <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-line p-3 has-[:checked]:border-brand-500 has-[:checked]:bg-brand-500/5">
                  <input type="radio" value="manual" className="mt-0.5 h-5 w-5 accent-brand-500" {...register('exchangeRateMode')} />
                  <span className="text-sm">
                    <span className="block font-semibold">My own rates</span>
                    <span className="text-muted">Use the rates you enter below, e.g. your bank's rate.</span>
                  </span>
                </label>
              </div>
            </fieldset>
          )}
          {foreign.length > 0 && rateMode === 'live' && (
            <div className="rounded-xl bg-surface-2 p-4 text-sm">
              {live ? (
                <>
                  <p className="font-semibold">Today's live rates</p>
                  <ul className="mt-1 flex flex-wrap gap-x-5 gap-y-1">
                    {foreign.map((c) => (
                      <li key={c}>
                        1 {c} = {live.rates[c] ? `${Number((1 / live.rates[c]).toPrecision(6))} ${defaultCurrency}` : 'not available'}
                      </li>
                    ))}
                  </ul>
                  {live.updatedAt && <p className="mt-1 text-xs text-muted">Updated {formatDate(live.updatedAt, { dateStyle: 'medium', timeStyle: 'short' })}</p>}
                </>
              ) : (
                <p className="text-muted">
                  {settings.liveExchangeRates
                    ? `Save to load live rates for ${defaultCurrency}.`
                    : "Live rates can't be fetched right now. Your own rates below are used meanwhile; without them visitors only see listed prices."}
                </p>
              )}
            </div>
          )}
          {foreign.length > 0 && (
            <>
              {rateMode === 'live' && <p className="text-sm font-semibold">Backup rates (optional)</p>}
              <div className="grid gap-4 sm:grid-cols-3">
                {foreign.map((c) => (
                  <TextField
                    key={c}
                    label={`1 ${c} = ? ${defaultCurrency}`}
                    inputMode="decimal"
                    placeholder="Leave blank for no estimate"
                    error={errors.ratesPerForeign?.[c]?.message}
                    {...register(`ratesPerForeign.${c}`)}
                  />
                ))}
              </div>
              <TextField label="Rate source" placeholder="e.g. Bank of Ghana interbank rate" error={errors.rateSource?.message} {...register('rateSource')} />
              <p className="text-xs text-muted">
                {settings.exchangeRates?.updatedAt
                  ? `Rates last changed ${formatDate(settings.exchangeRates.updatedAt, { dateStyle: 'medium', timeStyle: 'short' })}. The date updates automatically when you change a rate.`
                  : rateMode === 'live'
                    ? 'Optional — only used if live rates are unavailable.'
                    : 'No rates set — visitors will only see prices in the listed currency.'}
              </p>
            </>
          )}
        </Section>

        <Section title="About page" description="Only include facts about the business you can stand behind.">
          <TextField label="Heading" error={errors.aboutHeading?.message} {...register('aboutHeading')} />
          <TextAreaField label="Body" rows={6} hint="Separate paragraphs with a blank line." error={errors.aboutBody?.message} {...register('aboutBody')} />
        </Section>

        <Section title="Why choose us" description="Shown on the homepage. Up to 6 points.">
          {why.fields.map((f, i) => (
            <div key={f.id} className="rounded-xl border border-line p-4">
              <div className="grid gap-3 sm:grid-cols-[1fr_2fr_auto] sm:items-start">
                <TextField label="Title" error={errors.whyChooseUs?.[i]?.title?.message} {...register(`whyChooseUs.${i}.title`)} />
                <TextAreaField label="Description" rows={2} error={errors.whyChooseUs?.[i]?.body?.message} {...register(`whyChooseUs.${i}.body`)} />
                <Button variant="ghost" size="icon" aria-label={`Remove point ${i + 1}`} onClick={() => why.remove(i)} className="sm:mt-7">
                  <Trash2 className="h-4 w-4" aria-hidden />
                </Button>
              </div>
            </div>
          ))}
          {why.fields.length < 6 && (
            <Button variant="outline" size="sm" onClick={() => why.append({ title: '', body: '' })} leftIcon={<Plus className="h-4 w-4" aria-hidden />}>
              Add point
            </Button>
          )}
        </Section>

        <Section title="Social links">
          {social.fields.map((f, i) => (
            <div key={f.id} className="grid grid-cols-[1fr_2fr_auto] items-start gap-2">
              <TextField label="Name" hideLabel={i > 0} placeholder="Instagram" error={errors.socialLinks?.[i]?.label?.message} {...register(`socialLinks.${i}.label`)} />
              <TextField label="URL" hideLabel={i > 0} placeholder="https://…" error={errors.socialLinks?.[i]?.url?.message} {...register(`socialLinks.${i}.url`)} />
              <Button variant="ghost" size="icon" aria-label={`Remove link ${i + 1}`} onClick={() => social.remove(i)} className={i === 0 ? 'mt-7' : undefined}>
                <Trash2 className="h-4 w-4" aria-hidden />
              </Button>
            </div>
          ))}
          {social.fields.length < 10 && (
            <Button variant="outline" size="sm" onClick={() => social.append({ label: '', url: '' })} leftIcon={<Plus className="h-4 w-4" aria-hidden />}>
              Add link
            </Button>
          )}
        </Section>

        <Section title="Privacy notice" description="Shown on the contact page and linked from enquiry forms. Have this reviewed for your business.">
          <TextAreaField label="Notice text" rows={8} error={errors.privacyNotice?.message} {...register('privacyNotice')} />
        </Section>
      </div>

      <div className="sticky bottom-16 z-20 -mx-4 mt-6 border-t border-line bg-surface/95 px-4 py-3 backdrop-blur sm:hidden">
        <Button type="submit" className="w-full" loading={isSubmitting} disabled={!isDirty} leftIcon={<Save className="h-4 w-4" aria-hidden />}>
          Save settings
        </Button>
      </div>
    </form>
  );
}
