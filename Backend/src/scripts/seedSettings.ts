/**
 * Creates the site settings document with neutral placeholder content and syncs indexes.
 * Existing settings are never overwritten. Contact details are intentionally left
 * empty — add the real phone/WhatsApp/address in Admin → Settings.
 *
 *   npm run seed:settings
 */
import { connectDatabase, disconnectDatabase, syncIndexes } from '../lib/db.js';
import { SiteSettings } from '../models/SiteSettings.js';

async function main() {
  await connectDatabase();
  await syncIndexes();
  const res = await SiteSettings.updateOne(
    { key: 'site' },
    {
      $setOnInsert: {
        key: 'site',
        dealershipName: 'Goddel Motors',
        defaultCurrency: 'GHS',
        supportedCurrencies: ['GHS'],
        openingHours: [],
        socialLinks: [],
        whyChooseUs: [
          { title: 'Clear listings', body: 'Every listing shows the price and the details we have confirmed for that vehicle.' },
          { title: 'Talk to us directly', body: 'Reach the dealership by WhatsApp, phone or the enquiry form — no account needed.' },
          { title: 'Up-to-date availability', body: 'Vehicles are marked available, reserved or sold as soon as their status changes.' },
        ],
      },
    },
    { upsert: true },
  );
  console.log(res.upsertedCount ? 'Created default site settings.' : 'Site settings already exist — left unchanged.');
  console.log('Indexes are in sync.');
}

main()
  .catch((err) => {
    console.error(err instanceof Error ? err.message : err);
    process.exitCode = 1;
  })
  .finally(() => disconnectDatabase());
