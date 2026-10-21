/**
 * DEV-ONLY in-browser mock of the REST API, enabled with VITE_USE_MOCK_API=true while
 * running `npm run dev`. It lets the UI be previewed without MongoDB/Firebase/R2.
 * All data is clearly labelled sample data. It is never bundled into production builds
 * (see main.tsx) and provides no security — the real backend enforces everything.
 */
import { ApiError, type RequestOptions } from '@/lib/api';
import { DEFAULT_WHY_CHOOSE_US } from '@/lib/whyChooseUs';
import type {
  AdminSettings,
  AdminVehicle,
  AuditLogEntry,
  CurrentStaff,
  Enquiry,
  EnquiryStatus,
  Paginated,
  Permission,
  StaffMember,
  StaffRole,
  VehicleImage,
  VehicleSummary,
} from '@/types';
import { CURRENCIES } from '@/types';

const ALL: Permission[] = [
  'dashboard:read',
  'vehicles:read',
  'vehicles:write',
  'vehicles:images',
  'vehicles:archive',
  'vehicles:delete',
  'enquiries:read',
  'enquiries:update',
  'enquiries:assign',
  'enquiries:delete',
  'staff:manage',
  'settings:manage',
  'audit:read',
  'audit:delete',
];
const ROLE_PERMISSIONS: Record<StaffRole, Permission[]> = {
  owner: ALL,
  inventory_manager: ['dashboard:read', 'vehicles:read', 'vehicles:write', 'vehicles:images'],
  sales_assistant: ['dashboard:read', 'vehicles:read', 'enquiries:read', 'enquiries:update'],
};

let currentRole: StaffRole | null = null;
export function setMockRole(role: StaffRole | null) {
  currentRole = role;
}

const now = Date.now();
const iso = (msAgo: number) => new Date(now - msAgo).toISOString();
const DAY = 86_400_000;
let seq = 100;
const newId = () => `mock${(seq++).toString(16).padStart(20, '0')}`;
const delay = (ms = 250) => new Promise((r) => setTimeout(r, ms));

function demoImage(photo: string, title: string): VehicleImage {
  const v = (w: number) => ({ url: `/images/vehicles/demo/demo-${photo}-${w}.webp`, width: w, height: (w * 3) / 4 });
  return { id: newId(), url: v(1600).url, alt: `${title} — demonstration photo`, sortOrder: 0, width: 1600, height: 1200, variants: { thumb: v(480), medium: v(960), large: v(1600) } };
}

const staff: StaffMember[] = [
  { id: 'staff-owner', email: 'owner@example.com', displayName: 'Preview Owner', role: 'owner', status: 'active', lastLoginAt: iso(DAY), createdAt: iso(90 * DAY) },
  { id: 'staff-inventory', email: 'inventory@example.com', displayName: 'Preview Inventory', role: 'inventory_manager', status: 'active', lastLoginAt: iso(2 * DAY), createdAt: iso(60 * DAY) },
  { id: 'staff-sales', email: 'sales@example.com', displayName: 'Preview Sales', role: 'sales_assistant', status: 'active', createdAt: iso(30 * DAY) },
];
const staffForRole = (role: StaffRole) => staff.find((s) => s.role === role)!;

const DEMO = [
  { photo: 'suv', model: 'Compact SUV', year: 2021, price: 285000, bodyType: 'suv', mileage: 41000, fuelType: 'petrol', transmission: 'automatic', exteriorColor: 'Silver', availabilityStatus: 'available', features: ['Air conditioning', 'Reverse camera', 'Bluetooth'] },
  { photo: 'sedan', model: 'Midsize Sedan', year: 2019, price: 168000, bodyType: 'sedan', mileage: 62000, fuelType: 'petrol', transmission: 'automatic', exteriorColor: 'White', availabilityStatus: 'available', features: ['Air conditioning', 'Keyless entry'] },
  { photo: 'pickup', model: 'Double Cab Pickup', year: 2022, price: 410000, bodyType: 'pickup', mileage: 28000, fuelType: 'diesel', transmission: 'manual', drivetrain: '4wd', exteriorColor: 'Dark grey', availabilityStatus: 'reserved', features: ['Four-wheel drive', 'Tow bar'] },
  { photo: 'hatchback', model: 'City Hatchback', year: 2020, price: 132000, bodyType: 'hatchback', mileage: 54000, fuelType: 'petrol', transmission: 'automatic', exteriorColor: 'Blue', availabilityStatus: 'sold', features: ['Air conditioning'] },
] as const;

const vehicles: AdminVehicle[] = DEMO.map((d, i) => {
  const title = `${d.year} Sample ${d.model}`;
  return {
    ...d,
    features: [...d.features],
    id: `veh-${i + 1}`,
    slug: `${d.year}-sample-${d.model.toLowerCase().replace(/\s+/g, '-')}-demo${i}`,
    title,
    make: 'Sample',
    currency: 'GHS',
    condition: 'foreign_used',
    mileageUnit: 'km',
    visibility: 'published',
    isDemo: true,
    description: 'Demonstration listing used to preview the website layout. This is not a real vehicle for sale.',
    images: [demoImage(d.photo, title)],
    primaryImage: undefined,
    version: 0,
    createdAt: iso(i * DAY),
    updatedAt: iso(i * DAY),
  } as AdminVehicle;
});

const enquiries: Enquiry[] = [
  {
    id: 'enq-1',
    name: 'Sample Customer',
    phone: '+233 20 000 0001',
    email: 'customer@example.com',
    message: 'Sample enquiry for preview: is this vehicle still available for a viewing this week?',
    preferredContact: 'whatsapp',
    status: 'new',
    vehicle: { id: 'veh-1', title: vehicles[0].title, slug: vehicles[0].slug },
    notes: [],
    createdAt: iso(3 * 3_600_000),
    updatedAt: iso(3 * 3_600_000),
  },
  {
    id: 'enq-2',
    name: 'Preview Buyer',
    phone: '+233 20 000 0002',
    message: 'Sample general enquiry for preview purposes.',
    preferredContact: 'call',
    status: 'contacted',
    assignedTo: { id: 'staff-sales', name: 'Preview Sales' },
    notes: [{ id: 'note-1', body: 'Sample note: called and left a message.', authorName: 'Preview Sales', createdAt: iso(DAY) }],
    createdAt: iso(2 * DAY),
    updatedAt: iso(DAY),
  },
];

let settings: AdminSettings = {
  enquiryRetentionMonths: 12,
  dealershipName: 'Goddel Motors',
  motto: 'Trust In Every Drive',
  logoIncludesName: false,
  phone: '+233 20 000 0000',
  additionalPhones: [],
  whatsapp: '+233 20 000 0000',
  email: 'sales@example.com',
  address: 'Preview address — set in Admin › Settings',
  openingHours: [
    { label: 'Mon – Fri', hours: '8:00 – 18:00' },
    { label: 'Saturday', hours: '9:00 – 16:00' },
  ],
  socialLinks: [],
  defaultCurrency: 'GHS',
  supportedCurrencies: [...CURRENCIES],
  exchangeRateMode: 'live',
  exchangeRates: { base: 'GHS', rates: { USD: 0.0667 }, updatedAt: iso(DAY), source: 'Sample rate for preview only' },
  whyChooseUs: DEFAULT_WHY_CHOOSE_US.map((item) => ({ ...item })),
  updatedAt: iso(DAY),
};

/** Stand-in for the backend's live rates in preview mode — sample values, not market data. */
const SAMPLE_LIVE_RATES: AdminSettings['exchangeRates'] = {
  base: 'GHS',
  rates: { USD: 0.085, EUR: 0.076, GBP: 0.064, CAD: 0.117, NGN: 130, CNY: 0.6, AED: 0.31 },
  updatedAt: iso(0),
  source: 'Sample live rates (preview only)',
};

function effectiveRates(): AdminSettings['exchangeRates'] {
  if (settings.exchangeRateMode === 'live' && settings.defaultCurrency === 'GHS') return SAMPLE_LIVE_RATES;
  return settings.exchangeRates?.base === settings.defaultCurrency ? settings.exchangeRates : undefined;
}

const audit: AuditLogEntry[] = [{ id: 'audit-1', action: 'settings.update', actorEmail: 'owner@example.com', summary: 'Sample audit entry', createdAt: iso(DAY) }];

function me(): CurrentStaff {
  if (!currentRole) throw new ApiError(401, 'unauthenticated', 'Please sign in to continue.');
  return { ...staffForRole(currentRole), permissions: ROLE_PERMISSIONS[currentRole] };
}
function requirePerm(p: Permission) {
  const m = me();
  if (!m.permissions.includes(p)) throw new ApiError(403, 'forbidden', "Your role doesn't allow this action.");
  return m;
}
function log(action: string, summary: string) {
  audit.unshift({ id: newId(), action, actorEmail: me().email, summary, createdAt: new Date().toISOString() });
}

function paginate<T>(items: T[], page = 1, limit = 12): Paginated<T> {
  const totalPages = Math.max(1, Math.ceil(items.length / limit));
  return { items: items.slice((page - 1) * limit, page * limit), page, limit, total: items.length, totalPages };
}

function summary(v: AdminVehicle): VehicleSummary {
  return { ...publicVehicle(v), primaryImage: v.images[0] };
}
/** Mirrors the real API: staff-only fields never reach public pages. */
function publicVehicle(v: AdminVehicle) {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { vin, ...rest } = v;
  return rest;
}
const published = () => vehicles.filter((v) => v.visibility === 'published');
const findVehicle = (id: string) => {
  const v = vehicles.find((x) => x.id === id);
  if (!v) throw new ApiError(404, 'not_found', 'Vehicle not found.');
  return v;
};
const findEnquiry = (id: string) => {
  const e = enquiries.find((x) => x.id === id);
  if (!e) throw new ApiError(404, 'not_found', 'Enquiry not found.');
  return e;
};

function applyVehicleBody(v: AdminVehicle, body: Record<string, unknown>) {
  for (const [k, val] of Object.entries(body)) {
    if (k === 'version') continue;
    (v as unknown as Record<string, unknown>)[k] = val === null ? undefined : val;
  }
  v.title = [v.year, v.make, v.model, v.trim].filter(Boolean).join(' ');
  v.updatedAt = new Date().toISOString();
  v.updatedBy = { id: me().id, name: me().displayName };
}

function filesToImages(form: FormData | undefined, field: string, title: string, start: number): VehicleImage[] {
  return (form?.getAll(field) ?? []).map((f, i) => {
    const url = URL.createObjectURL(f as File);
    return { id: newId(), url, alt: title, sortOrder: start + i };
  });
}

type Opts = RequestOptions & { formData?: FormData };

export async function handle(path: string, opts: Opts): Promise<unknown> {
  await delay();
  const method = opts.method ?? 'GET';
  const q = (opts.query ?? {}) as Record<string, string | number | undefined>;
  const body = (opts.body ?? {}) as Record<string, unknown>;
  const seg = path.split('/').filter(Boolean);
  const route = `${method} ${path}`;

  // ---- Public ----
  if (route === 'GET /settings/public') {
    const pub: Partial<AdminSettings> = { ...settings, exchangeRates: effectiveRates() };
    delete pub.updatedAt;
    delete pub.liveExchangeRates;
    delete pub.enquiryRetentionMonths;
    return pub;
  }
  if (route === 'GET /vehicles/facets') {
    const p = published();
    return {
      makes: [...new Set(p.map((v) => v.make))],
      bodyTypes: [...new Set(p.map((v) => v.bodyType).filter(Boolean))],
      fuelTypes: [...new Set(p.map((v) => v.fuelType).filter(Boolean))],
      transmissions: [...new Set(p.map((v) => v.transmission).filter(Boolean))],
      conditions: [...new Set(p.map((v) => v.condition).filter(Boolean))],
      years: { min: Math.min(...p.map((v) => v.year)), max: Math.max(...p.map((v) => v.year)) },
      price: (() => {
        const rates: Partial<Record<string, number>> = effectiveRates()?.rates ?? {};
        const inBase = p
          .map((v) => (v.currency === settings.defaultCurrency ? v.price : rates[v.currency] ? v.price / rates[v.currency]! : null))
          .filter((n): n is number => n !== null);
        return inBase.length ? { min: Math.min(...inBase), max: Math.max(...inBase) } : { min: null, max: null };
      })(),
    };
  }
  if (method === 'GET' && seg[0] === 'vehicles' && seg.length === 1) {
    let list = published();
    const avail = (q.availability as string) ?? 'in_stock';
    if (avail === 'in_stock') list = list.filter((v) => v.availabilityStatus !== 'sold');
    else if (avail !== 'all') list = list.filter((v) => v.availabilityStatus === avail);
    if (q.q) list = list.filter((v) => v.title.toLowerCase().includes(String(q.q).toLowerCase()));
    for (const key of ['make', 'bodyType', 'fuelType', 'transmission', 'condition'] as const) {
      if (q[key]) list = list.filter((v) => v[key] === q[key]);
    }
    const rates: Partial<Record<string, number>> = effectiveRates()?.rates ?? {};
    const toBase = (amount: number, currency: string) => (currency === settings.defaultCurrency ? amount : rates[currency] ? amount / rates[currency]! : null);
    const inBase = (v: AdminVehicle) => toBase(v.price, v.currency);
    const boundCurrency = (q.priceCurrency as string | undefined) ?? settings.defaultCurrency;
    const bound = (value: unknown) => {
      const converted = toBase(Number(value), boundCurrency);
      if (converted === null) throw new ApiError(400, 'bad_request', `Prices can't be compared in ${boundCurrency} right now.`);
      return converted;
    };
    if (q.minPrice) list = list.filter((v) => (inBase(v) ?? -1) >= bound(q.minPrice));
    if (q.maxPrice) list = list.filter((v) => inBase(v) !== null && inBase(v)! <= bound(q.maxPrice));
    if (q.minYear) list = list.filter((v) => v.year >= Number(q.minYear));
    if (q.maxYear) list = list.filter((v) => v.year <= Number(q.maxYear));
    const sortKey = (v: AdminVehicle) => inBase(v) ?? Number.POSITIVE_INFINITY;
    if (q.sort === 'price_asc') list = [...list].sort((a, b) => sortKey(a) - sortKey(b));
    else if (q.sort === 'price_desc') list = [...list].sort((a, b) => (inBase(b) ?? -1) - (inBase(a) ?? -1));
    return paginate(list.map(summary), Number(q.page ?? 1), Number(q.limit ?? 12));
  }
  if (method === 'GET' && seg[0] === 'vehicles' && seg.length === 2) {
    const v = published().find((x) => x.slug === decodeURIComponent(seg[1]));
    if (!v) throw new ApiError(404, 'not_found', 'Vehicle not found.');
    return { vehicle: publicVehicle(v), related: published().filter((x) => x.id !== v.id && x.availabilityStatus !== 'sold').slice(0, 3).map(summary) };
  }
  if (route === 'POST /enquiries') {
    const vehicle = vehicles.find((v) => v.id === body.vehicleId);
    const e: Enquiry = {
      id: `enq-${newId()}`,
      name: String(body.name),
      phone: String(body.phone),
      email: (body.email as string) || undefined,
      message: String(body.message),
      preferredContact: body.preferredContact as Enquiry['preferredContact'],
      status: 'new',
      vehicle: vehicle && { id: vehicle.id, title: vehicle.title, slug: vehicle.slug },
      notes: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    enquiries.unshift(e);
    return { id: e.id };
  }

  // ---- Admin ----
  if (seg[0] !== 'admin') throw new ApiError(404, 'not_found', 'Not found.');
  const r = seg.slice(1);

  if (r[0] === 'me') {
    if (method === 'PATCH') {
      const name = String(body.displayName ?? '').trim();
      if (name.length < 2) throw new ApiError(400, 'bad_request', 'Enter a name.');
      const self = staff.find((s) => s.id === me().id)!;
      log('staff.rename_self', `Changed own name from ${self.displayName} to ${name}`);
      self.displayName = name;
    }
    return me();
  }
  if (r[0] === 'dashboard') {
    const m = requirePerm('dashboard:read');
    const count = (f: (v: AdminVehicle) => boolean) => vehicles.filter(f).length;
    const canEnq = m.permissions.includes('enquiries:read');
    return {
      vehicles: {
        total: count((v) => v.visibility !== 'archived'),
        available: count((v) => v.visibility === 'published' && v.availabilityStatus === 'available'),
        reserved: count((v) => v.visibility === 'published' && v.availabilityStatus === 'reserved'),
        sold: count((v) => v.availabilityStatus === 'sold'),
        draft: count((v) => v.visibility === 'draft'),
        archived: count((v) => v.visibility === 'archived'),
      },
      enquiries: canEnq ? { new: enquiries.filter((e) => e.status === 'new').length, total: enquiries.length } : undefined,
      recentVehicles: [...vehicles].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)).slice(0, 5),
      recentEnquiries: canEnq ? enquiries.slice(0, 5) : undefined,
    };
  }

  if (r[0] === 'vehicles') {
    const vid = r[1];
    if (!vid) {
      if (method === 'POST') {
        requirePerm('vehicles:write');
        const v = { id: `veh-${newId()}`, slug: `new-${newId()}`, images: [], features: [], version: 0, createdAt: new Date().toISOString() } as unknown as AdminVehicle;
        applyVehicleBody(v, body);
        vehicles.unshift(v);
        log('vehicle.create', `Created ${v.title}`);
        return v;
      }
      const m = requirePerm('vehicles:read');
      let list = [...vehicles];
      if (q.visibility) list = list.filter((v) => v.visibility === q.visibility);
      else list = list.filter((v) => v.visibility !== 'archived');
      if (!m.permissions.includes('vehicles:archive')) list = list.filter((v) => v.visibility !== 'archived');
      if (q.availability) list = list.filter((v) => v.availabilityStatus === q.availability);
      if (q.q) list = list.filter((v) => v.title.toLowerCase().includes(String(q.q).toLowerCase()));
      return paginate(list.map((v) => ({ ...v, primaryImage: v.images[0] })), Number(q.page ?? 1), Number(q.limit ?? 20));
    }
    const v = findVehicle(vid);
    if (r.length === 2) {
      if (method === 'GET') {
        requirePerm('vehicles:read');
        return v;
      }
      if (method === 'PATCH') {
        requirePerm('vehicles:write');
        if (body.version !== v.version) throw new ApiError(409, 'version_conflict', 'This vehicle was changed by someone else.');
        applyVehicleBody(v, body);
        v.version += 1;
        log('vehicle.update', `Updated ${v.title}`);
        return v;
      }
      if (method === 'DELETE') {
        requirePerm('vehicles:delete');
        vehicles.splice(vehicles.indexOf(v), 1);
        log('vehicle.delete', `Deleted ${v.title}`);
        return undefined;
      }
    }
    if (r[2] === 'archive' || r[2] === 'restore') {
      requirePerm('vehicles:archive');
      v.visibility = r[2] === 'archive' ? 'archived' : 'draft';
      v.version += 1;
      log(`vehicle.${r[2]}`, `${r[2] === 'archive' ? 'Archived' : 'Restored'} ${v.title}`);
      return v;
    }
    if (r[2] === 'images') {
      requirePerm('vehicles:images');
      if (r.length === 3 && method === 'POST') {
        const added = filesToImages(opts.formData, 'photos', v.title, v.images.length);
        v.images.push(...added);
        return { images: v.images };
      }
      if (r[3] === 'order') {
        const ids = body.imageIds as string[];
        v.images = ids.map((i, idx) => ({ ...v.images.find((img) => img.id === i)!, sortOrder: idx }));
        return undefined;
      }
      const img = v.images.find((i) => i.id === r[3]);
      if (!img) throw new ApiError(404, 'not_found', 'Photo not found.');
      if (r[4] === 'file') {
        const [replacement] = filesToImages(opts.formData, 'photo', img.alt, img.sortOrder);
        Object.assign(img, { url: replacement.url, variants: undefined });
        return img;
      }
      if (method === 'PATCH') {
        img.alt = String(body.alt);
        return undefined;
      }
      if (method === 'DELETE') {
        v.images = v.images.filter((i) => i.id !== img.id);
        return undefined;
      }
    }
  }

  if (r[0] === 'enquiries') {
    if (r[1] === 'assignees') {
      requirePerm('enquiries:assign');
      return staff.filter((s) => s.status === 'active' && s.role !== 'inventory_manager').map((s) => ({ id: s.id, name: s.displayName, role: s.role }));
    }
    if (!r[1]) {
      const m = requirePerm('enquiries:read');
      let list = [...enquiries];
      if (q.status) list = list.filter((e) => e.status === (q.status as EnquiryStatus));
      if (q.assigned === 'me') list = list.filter((e) => e.assignedTo?.id === m.id);
      if (q.q) {
        const term = String(q.q).toLowerCase();
        list = list.filter((e) => [e.name, e.phone, e.email, e.vehicle?.title].some((f) => f?.toLowerCase().includes(term)));
      }
      return paginate(list, Number(q.page ?? 1), 20);
    }
    const e = findEnquiry(r[1]);
    if (method === 'DELETE') {
      requirePerm('enquiries:delete');
      enquiries.splice(enquiries.indexOf(e), 1);
      log('enquiry.delete', e.vehicle ? `Deleted an enquiry about ${e.vehicle.title}` : 'Deleted a general enquiry');
      return undefined;
    }
    if (r[2] === 'notes') {
      const m = requirePerm('enquiries:update');
      e.notes.push({ id: newId(), body: String(body.body), authorName: m.displayName, createdAt: new Date().toISOString() });
      return e;
    }
    if (method === 'PATCH') {
      requirePerm('enquiries:update');
      if ('assignedTo' in body) {
        requirePerm('enquiries:assign');
        const a = staff.find((s) => s.id === body.assignedTo);
        e.assignedTo = a ? { id: a.id, name: a.displayName } : undefined;
      }
      if (body.status) e.status = body.status as EnquiryStatus;
      e.updatedAt = new Date().toISOString();
      return e;
    }
    requirePerm('enquiries:read');
    return e;
  }

  if (r[0] === 'staff') {
    const m = requirePerm('staff:manage');
    const link = 'https://example.com/__/auth/action?mode=resetPassword&oobCode=PREVIEW-ONLY';
    if (!r[1] && method === 'GET') return staff;
    if (!r[1] && method === 'POST') {
      if (staff.some((s) => s.email === String(body.email).toLowerCase())) throw new ApiError(409, 'conflict', 'A team member with this email already exists.');
      const s: StaffMember = { id: `staff-${newId()}`, email: String(body.email).toLowerCase(), displayName: String(body.displayName), role: body.role as StaffRole, status: 'active', createdAt: new Date().toISOString() };
      staff.push(s);
      log('staff.invite', `Invited ${s.email}`);
      return { staff: s, delivery: { method: 'manual', emailed: false, setupLink: link } };
    }
    const s = staff.find((x) => x.id === r[1]);
    if (!s) throw new ApiError(404, 'not_found', 'Team member not found.');
    if (r[2] === 'setup-link') return { email: s.email, delivery: { method: 'smtp', emailed: true } };
    if (s.id === m.id) throw new ApiError(400, 'bad_request', "You can't change your own role or status.");
    Object.assign(s, body);
    log('staff.update', `Updated ${s.email}`);
    return s;
  }

  if (r[0] === 'settings') {
    requirePerm('settings:manage');
    if (r[1] === 'logo') {
      if (method === 'PUT') {
        const file = opts.formData?.get('logo');
        if (!(file instanceof File)) throw new ApiError(400, 'bad_request', 'Choose a logo image to upload.');
        settings = { ...settings, logoUrl: URL.createObjectURL(file) };
        log('settings.logo.upload', 'Uploaded a new logo');
      } else if (method === 'DELETE') {
        settings = { ...settings, logoUrl: undefined, logoIncludesName: false };
        log('settings.logo.delete', 'Removed the custom logo');
      }
      return { ...settings, updatedAt: new Date().toISOString() };
    }
    if (method === 'PUT') {
      const rates = (body.exchangeRates as { rates: Record<string, number>; source?: string } | undefined) ?? undefined;
      settings = {
        ...(body as unknown as AdminSettings),
        logoUrl: settings.logoUrl,
        logoIncludesName: Boolean(settings.logoUrl && body.logoIncludesName),
        exchangeRates: rates ? { base: body.defaultCurrency as AdminSettings['defaultCurrency'], rates: rates.rates, source: rates.source, updatedAt: new Date().toISOString() } : undefined,
        updatedAt: new Date().toISOString(),
      };
      log('settings.update', 'Updated site settings');
    }
    return { ...settings, liveExchangeRates: settings.defaultCurrency === 'GHS' ? SAMPLE_LIVE_RATES : undefined };
  }

  if (r[0] === 'audit-logs') {
    if (method === 'DELETE') {
      requirePerm('audit:delete');
      if (r[1]) {
        const index = audit.findIndex((a) => a.id === r[1]);
        if (index < 0) throw new ApiError(404, 'not_found', 'Audit entry not found.');
        audit.splice(index, 1);
        return undefined;
      }
      const removed = audit.length;
      audit.length = 0;
      log('audit.clear', `Cleared the audit log (${removed} ${removed === 1 ? 'entry' : 'entries'} removed)`);
      return { removed };
    }
    requirePerm('audit:read');
    return paginate(audit, Number(q.page ?? 1), 30);
  }

  throw new ApiError(404, 'not_found', `Mock API has no handler for ${method} ${path}`);
}
