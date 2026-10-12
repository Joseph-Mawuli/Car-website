import { useEffect, useState, type ReactNode } from 'react';
import { Link, useNavigate, useParams } from 'react-router';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { ChevronLeft, ExternalLink, Save } from 'lucide-react';
import { adminApi } from '@/features/admin/api';
import { useAuth } from '@/features/admin/AuthProvider';
import { PhotoManager } from '@/features/admin/PhotoManager';
import { AvailabilityBadge, Badge, VisibilityBadge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { SelectField, TextAreaField, TextField } from '@/components/ui/Field';
import { Alert, ErrorState, PageLoader } from '@/components/ui/States';
import { useToast } from '@/components/ui/Toast';
import { useQuery } from '@/hooks/useQuery';
import { ApiError, errorMessage } from '@/lib/api';
import { formatDate } from '@/lib/format';
import {
  AVAILABILITY_LABELS,
  BODY_TYPE_LABELS,
  CONDITION_LABELS,
  DRIVETRAIN_LABELS,
  FUEL_LABELS,
  TRANSMISSION_LABELS,
  optionsFrom,
} from '@/lib/labels';
import { CURRENCIES, CURRENCY_NAMES, type AdminVehicle } from '@/types';

const maxYear = new Date().getFullYear() + 1;

const formSchema = z.object({
  make: z.string().trim().min(1, 'Make is required.').max(40),
  model: z.string().trim().min(1, 'Model is required.').max(60),
  trim: z.string().trim().max(60),
  year: z
    .string()
    .regex(/^\d{4}$/, 'Enter a 4-digit year.')
    .refine((v) => Number(v) >= 1950 && Number(v) <= maxYear, `Year must be between 1950 and ${maxYear}.`),
  price: z.string().regex(/^\d+(\.\d{1,2})?$/, 'Enter the price as a number, without commas.'),
  currency: z.enum(CURRENCIES),
  availabilityStatus: z.enum(['available', 'reserved', 'sold']),
  visibility: z.enum(['published', 'draft', 'archived']),
  condition: z.string(),
  bodyType: z.string(),
  mileage: z.string().regex(/^\d*$/, 'Whole numbers only, without commas.'),
  mileageUnit: z.enum(['km', 'mi']),
  engineSize: z.string().trim().max(30),
  fuelType: z.string(),
  transmission: z.string(),
  drivetrain: z.string(),
  exteriorColor: z.string().trim().max(40),
  interiorColor: z.string().trim().max(40),
  location: z.string().trim().max(120),
  description: z.string().trim().max(5000),
  featuresText: z.string().max(8000),
  conditionNotes: z.string().trim().max(2000),
  knownDefects: z.string().trim().max(2000),
});
type FormValues = z.infer<typeof formSchema>;

const EMPTY: FormValues = {
  make: '',
  model: '',
  trim: '',
  year: '',
  price: '',
  currency: 'GHS',
  availabilityStatus: 'available',
  visibility: 'draft',
  condition: '',
  bodyType: '',
  mileage: '',
  mileageUnit: 'km',
  engineSize: '',
  fuelType: '',
  transmission: '',
  drivetrain: '',
  exteriorColor: '',
  interiorColor: '',
  location: '',
  description: '',
  featuresText: '',
  conditionNotes: '',
  knownDefects: '',
};

function toForm(v: AdminVehicle): FormValues {
  return {
    make: v.make,
    model: v.model,
    trim: v.trim ?? '',
    year: String(v.year),
    price: String(v.price),
    currency: v.currency,
    availabilityStatus: v.availabilityStatus,
    visibility: v.visibility,
    condition: v.condition ?? '',
    bodyType: v.bodyType ?? '',
    mileage: v.mileage !== undefined ? String(v.mileage) : '',
    mileageUnit: v.mileageUnit ?? 'km',
    engineSize: v.engineSize ?? '',
    fuelType: v.fuelType ?? '',
    transmission: v.transmission ?? '',
    drivetrain: v.drivetrain ?? '',
    exteriorColor: v.exteriorColor ?? '',
    interiorColor: v.interiorColor ?? '',
    location: v.location ?? '',
    description: v.description ?? '',
    featuresText: v.features.join('\n'),
    conditionNotes: v.conditionNotes ?? '',
    knownDefects: v.knownDefects ?? '',
  };
}

/** Empty optional fields become `null` so the API clears them rather than storing invented values. */
function toPayload(values: FormValues): Record<string, unknown> {
  const opt = (v: string) => (v.trim() === '' ? null : v.trim());
  return {
    make: values.make.trim(),
    model: values.model.trim(),
    trim: opt(values.trim),
    year: Number(values.year),
    price: Number(values.price),
    currency: values.currency,
    availabilityStatus: values.availabilityStatus,
    visibility: values.visibility,
    condition: opt(values.condition),
    bodyType: opt(values.bodyType),
    mileage: values.mileage === '' ? null : Number(values.mileage),
    mileageUnit: values.mileage === '' ? null : values.mileageUnit,
    engineSize: opt(values.engineSize),
    fuelType: opt(values.fuelType),
    transmission: opt(values.transmission),
    drivetrain: opt(values.drivetrain),
    exteriorColor: opt(values.exteriorColor),
    interiorColor: opt(values.interiorColor),
    location: opt(values.location),
    description: opt(values.description),
    features: values.featuresText
      .split('\n')
      .map((f) => f.trim())
      .filter(Boolean),
    conditionNotes: opt(values.conditionNotes),
    knownDefects: opt(values.knownDefects),
  };
}

function Section({ title, description, children, id }: { title: string; description?: string; children: ReactNode; id?: string }) {
  return (
    <section id={id} className="card scroll-mt-20 p-5 sm:p-6">
      <h2 className="text-lg font-semibold">{title}</h2>
      {description && <p className="mt-1 text-sm text-muted">{description}</p>}
      <div className="mt-5">{children}</div>
    </section>
  );
}

export function VehicleEditorPage() {
  const { id } = useParams();
  const isNew = !id;
  const { data, error, isLoading, reload, setData } = useQuery(isNew ? null : `admin-vehicle:${id}`, (signal) => adminApi.getVehicle(id!, signal));

  if (!isNew && error) return <ErrorState error={error} title="Could not load this vehicle" onRetry={reload} />;
  if (!isNew && (isLoading || !data)) return <PageLoader />;
  return <VehicleEditor key={data ? `${data.id}:${data.version}` : 'new'} vehicle={data} onSaved={(v) => setData(v)} onReload={reload} />;
}

function VehicleEditor({ vehicle, onSaved, onReload }: { vehicle?: AdminVehicle; onSaved: (v: AdminVehicle) => void; onReload: () => void }) {
  const { can } = useAuth();
  const navigate = useNavigate();
  const { notify } = useToast();
  const readOnly = !can('vehicles:write') || (vehicle?.visibility === 'archived' && !can('vehicles:archive'));
  const [serverError, setServerError] = useState<string | null>(null);
  const [conflict, setConflict] = useState(false);
  const [images, setImages] = useState(vehicle?.images ?? []);

  const {
    register,
    handleSubmit,
    reset,
    setError,
    formState: { errors, isSubmitting, isDirty },
  } = useForm<FormValues>({ resolver: zodResolver(formSchema), defaultValues: vehicle ? toForm(vehicle) : EMPTY });

  useEffect(() => {
    if (window.location.hash === '#photos') document.getElementById('photos')?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  useEffect(() => {
    if (!isDirty) return;
    const warn = (e: BeforeUnloadEvent) => e.preventDefault();
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, [isDirty]);

  const onSubmit = async (values: FormValues) => {
    setServerError(null);
    setConflict(false);
    try {
      const payload = toPayload(values);
      if (vehicle) {
        const updated = await adminApi.updateVehicle(vehicle.id, { ...payload, version: vehicle.version });
        reset(toForm(updated));
        onSaved(updated);
        notify('Vehicle saved');
      } else {
        const created = await adminApi.createVehicle(payload);
        notify('Vehicle created — now add photos');
        navigate(`/admin/inventory/${created.id}#photos`, { replace: true });
      }
    } catch (err) {
      if (err instanceof ApiError && err.code === 'version_conflict') setConflict(true);
      if (err instanceof ApiError && err.details) {
        for (const [field, msgs] of Object.entries(err.details)) {
          const key = (field === 'features' ? 'featuresText' : field) as keyof FormValues;
          if (key in EMPTY) setError(key, { message: msgs[0] });
        }
      }
      setServerError(errorMessage(err));
    }
  };

  const title = vehicle ? vehicle.title : 'Add vehicle';
  const currencyOptions = CURRENCIES.map((c) => ({ value: c, label: `${c} — ${CURRENCY_NAMES[c]}` }));

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate>
      <Link to="/admin/inventory" className="mb-3 inline-flex min-h-9 items-center gap-1 text-sm font-semibold text-muted hover:text-fg">
        <ChevronLeft className="h-4 w-4" aria-hidden /> Inventory
      </Link>
      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold sm:text-3xl">{title}</h1>
          {vehicle && (
            <div className="mt-2 flex flex-wrap items-center gap-2 text-sm text-muted">
              <AvailabilityBadge status={vehicle.availabilityStatus} />
              <VisibilityBadge visibility={vehicle.visibility} />
              {vehicle.isDemo && <Badge tone="amber">Demo listing</Badge>}
              <span>
                Updated {formatDate(vehicle.updatedAt, { dateStyle: 'medium', timeStyle: 'short' })}
                {vehicle.updatedBy && ` by ${vehicle.updatedBy.name}`}
              </span>
            </div>
          )}
        </div>
        <div className="flex gap-2">
          {vehicle?.visibility === 'published' && (
            <a href={`/cars/${vehicle.slug}`} target="_blank" rel="noopener" className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-line-strong px-4 text-sm font-semibold hover:border-brand-500">
              <ExternalLink className="h-4 w-4" aria-hidden /> Preview
            </a>
          )}
          {!readOnly && (
            <Button type="submit" loading={isSubmitting} leftIcon={<Save className="h-4 w-4" aria-hidden />} className="hidden sm:inline-flex">
              {vehicle ? 'Save changes' : 'Create vehicle'}
            </Button>
          )}
        </div>
      </div>

      {readOnly && (
        <Alert tone="info" className="mb-5">
          You can view this listing, but your role can't edit it.
        </Alert>
      )}
      {conflict && (
        <Alert tone="warning" className="mb-5">
          Someone else saved this vehicle while you were editing.{' '}
          <button type="button" className="font-semibold underline" onClick={onReload}>
            Load the latest version
          </button>{' '}
          (your unsaved changes will be lost), then apply your changes again.
        </Alert>
      )}
      {serverError && !conflict && (
        <Alert tone="error" className="mb-5">
          {serverError}
        </Alert>
      )}

      <fieldset disabled={readOnly || isSubmitting} className="space-y-5">
        <Section title="Vehicle details" description="Only enter details you have verified. Leave unknown fields blank.">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <TextField label="Make" required placeholder="e.g. Toyota" error={errors.make?.message} {...register('make')} />
            <TextField label="Model" required placeholder="e.g. RAV4" error={errors.model?.message} {...register('model')} />
            <TextField label="Trim / variant" placeholder="e.g. XLE" error={errors.trim?.message} {...register('trim')} />
            <TextField label="Year" required inputMode="numeric" maxLength={4} error={errors.year?.message} {...register('year')} />
            <SelectField label="Body type" placeholder="Not specified" options={optionsFrom(BODY_TYPE_LABELS)} {...register('bodyType')} />
            <SelectField label="Condition" placeholder="Not specified" options={optionsFrom(CONDITION_LABELS)} {...register('condition')} />
          </div>
        </Section>

        <Section title="Price & availability">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <TextField label="Price" required inputMode="decimal" placeholder="e.g. 280000" error={errors.price?.message} {...register('price')} />
            <SelectField label="Currency" options={currencyOptions} {...register('currency')} />
            <SelectField label="Availability" options={optionsFrom(AVAILABILITY_LABELS)} {...register('availabilityStatus')} />
            <SelectField
              label="Visibility"
              hint="Drafts are hidden from the public website."
              options={[
                { value: 'published', label: 'Published' },
                { value: 'draft', label: 'Draft' },
                ...(vehicle?.visibility === 'archived' ? [{ value: 'archived', label: 'Archived' }] : []),
              ]}
              {...register('visibility')}
            />
          </div>
        </Section>

        <Section title="Specifications">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <div className="grid grid-cols-[1fr_90px] gap-2">
              <TextField label="Mileage" inputMode="numeric" placeholder="e.g. 45000" error={errors.mileage?.message} {...register('mileage')} />
              <SelectField label="Unit" options={[{ value: 'km', label: 'km' }, { value: 'mi', label: 'mi' }]} {...register('mileageUnit')} />
            </div>
            <TextField label="Engine" placeholder="e.g. 2.5L 4-cylinder" error={errors.engineSize?.message} {...register('engineSize')} />
            <SelectField label="Fuel type" placeholder="Not specified" options={optionsFrom(FUEL_LABELS)} {...register('fuelType')} />
            <SelectField label="Transmission" placeholder="Not specified" options={optionsFrom(TRANSMISSION_LABELS)} {...register('transmission')} />
            <SelectField label="Drivetrain" placeholder="Not specified" options={optionsFrom(DRIVETRAIN_LABELS)} {...register('drivetrain')} />
            <TextField label="Exterior colour" error={errors.exteriorColor?.message} {...register('exteriorColor')} />
            <TextField label="Interior colour" error={errors.interiorColor?.message} {...register('interiorColor')} />
            <TextField label="Vehicle location" placeholder="e.g. Accra showroom" error={errors.location?.message} {...register('location')} />
          </div>
        </Section>

        <Section title="Description & features">
          <div className="grid gap-4 lg:grid-cols-2">
            <TextAreaField label="Description" rows={7} hint="Describe the vehicle using verified information only." error={errors.description?.message} {...register('description')} />
            <TextAreaField label="Features & equipment" rows={7} hint="One feature per line, e.g. Reverse camera" error={errors.featuresText?.message} {...register('featuresText')} />
          </div>
        </Section>

        <Section title="Condition" description="Being upfront about known issues builds trust with buyers.">
          <div className="grid gap-4 lg:grid-cols-2">
            <TextAreaField label="Condition notes" rows={4} error={errors.conditionNotes?.message} {...register('conditionNotes')} />
            <TextAreaField label="Known defects" rows={4} error={errors.knownDefects?.message} {...register('knownDefects')} />
          </div>
        </Section>
      </fieldset>

      <div className="mt-5">
        <Section id="photos" title="Photos" description={vehicle ? 'The first photo is used as the cover image.' : undefined}>
          {vehicle ? (
            <PhotoManager
              vehicleId={vehicle.id}
              vehicleTitle={vehicle.title}
              images={images}
              onChange={setImages}
              readOnly={!can('vehicles:images') || readOnly}
            />
          ) : (
            <p className="text-sm text-muted">Create the vehicle first, then you can upload and arrange photos.</p>
          )}
        </Section>
      </div>

      {!readOnly && (
        <div className="sticky bottom-16 z-20 -mx-4 mt-6 border-t border-line bg-surface/95 px-4 py-3 backdrop-blur sm:hidden">
          <Button type="submit" className="w-full" loading={isSubmitting} leftIcon={<Save className="h-4 w-4" aria-hidden />}>
            {vehicle ? 'Save changes' : 'Create vehicle'}
          </Button>
        </div>
      )}
    </form>
  );
}
