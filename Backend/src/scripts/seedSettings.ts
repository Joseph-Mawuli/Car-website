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
          { title: 'Trust & Transparency', body: 'Clear communication and honest dealings to help you buy with confidence.' },
          { title: 'International Vehicle Sourcing', body: 'Access to vehicles sourced from the USA, Canada, and Japan.' },
          { title: 'Wide Range of Vehicles', body: 'Options spanning brand-new, foreign-used, and Ghanaian-used cars.' },
          { title: 'Options for Every Budget', body: 'We work with your budget and preferences to identify suitable vehicles.' },
          { title: 'Personalised Service', body: 'We listen to your needs and help you find the right car for your lifestyle.' },
          { title: 'Your Satisfaction Matters', body: 'We aim to make your vehicle-buying journey smooth, informed, and rewarding.' },
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
