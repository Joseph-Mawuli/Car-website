/**
 * OPTIONAL: inserts clearly-labelled demonstration listings so the site can be
 * previewed before real stock is added. Every record has `isDemo: true`, is shown
 * with a "Demo" badge and a warning on its detail page, and uses generic,
 * unbranded AI-generated photos served from the frontend's /images/vehicles/demo.
 *
 *   npm run seed:demo -- --frontend-url https://your-site.example   # insert
 *   npm run seed:demo -- --remove                                    # delete all demo listings
 *
 * Remove demo data before launch.
 */
import { parseArgs } from 'node:util';
import { Types } from 'mongoose';
import { connectDatabase, disconnectDatabase } from '../lib/db.js';
import { Vehicle } from '../models/Vehicle.js';
import { env } from '../config/env.js';
import { vehicleSlug } from '../lib/text.js';

const DEMO = [
  { photo: 'suv', make: 'Sample', model: 'Compact SUV', year: 2021, price: 285000, bodyType: 'suv', mileage: 41000, fuelType: 'petrol', transmission: 'automatic', exteriorColor: 'Silver', availabilityStatus: 'available', features: ['Air conditioning', 'Reverse camera', 'Bluetooth'] },
  { photo: 'sedan', make: 'Sample', model: 'Midsize Sedan', year: 2019, price: 168000, bodyType: 'sedan', mileage: 62000, fuelType: 'petrol', transmission: 'automatic', exteriorColor: 'White', availabilityStatus: 'available', features: ['Air conditioning', 'Keyless entry'] },
  { photo: 'pickup', make: 'Sample', model: 'Double Cab Pickup', year: 2022, price: 410000, bodyType: 'pickup', mileage: 28000, fuelType: 'diesel', transmission: 'manual', drivetrain: '4wd', exteriorColor: 'Dark grey', availabilityStatus: 'reserved', features: ['Four-wheel drive', 'Tow bar'] },
  { photo: 'hatchback', make: 'Sample', model: 'City Hatchback', year: 2020, price: 132000, bodyType: 'hatchback', mileage: 54000, fuelType: 'petrol', transmission: 'automatic', exteriorColor: 'Blue', availabilityStatus: 'sold', features: ['Air conditioning'] },
] as const;

async function main() {
  const { values } = parseArgs({ options: { remove: { type: 'boolean' }, 'frontend-url': { type: 'string' } } });
  await connectDatabase();

  if (values.remove) {
    const res = await Vehicle.deleteMany({ isDemo: true });
    console.log(`Removed ${res.deletedCount} demo listing(s).`);
    return;
  }

  const base = (values['frontend-url'] ?? env.PUBLIC_SITE_URL).replace(/\/+$/, '');
  const docs = DEMO.map((d, i) => {
    const title = `${d.year} ${d.make} ${d.model}`;
    const img = (w: number) => ({ key: `static/demo/demo-${d.photo}-${w}.webp`, url: `${base}/images/vehicles/demo/demo-${d.photo}-${w}.webp`, width: w, height: Math.round((w * 3) / 4) });
    return {
      ...d,
      features: [...d.features],
      slug: vehicleSlug(d),
      currency: 'GHS',
      condition: 'foreign_used',
      mileageUnit: 'km',
      visibility: 'published',
      isDemo: true,
      description: 'Demonstration listing used to preview the website layout. This is not a real vehicle for sale.',
      createdAt: new Date(Date.now() - i * 86_400_000),
      images: [
        {
          _id: new Types.ObjectId(),
          key: `static/demo/demo-${d.photo}-1600.webp`,
          url: img(1600).url,
          alt: `${title} — demonstration photo`,
          sortOrder: 0,
          width: 1600,
          height: 1200,
          mimeType: 'image/webp',
          source: 'static',
          variants: { thumb: img(480), medium: img(960), large: img(1600) },
          uploadedAt: new Date(),
        },
      ],
    };
  });
  await Vehicle.insertMany(docs);
  console.log(`Inserted ${docs.length} demo listings (flagged isDemo). Remove them before launch with: npm run seed:demo -- --remove`);
}

main()
  .catch((err) => {
    console.error(err instanceof Error ? err.message : err);
    process.exitCode = 1;
  })
  .finally(() => disconnectDatabase());
