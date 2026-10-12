/**
 * Bootstraps the first owner account (there is no public sign-up).
 *
 *   npm run create-owner -- --email owner@example.com --name "Owner Name"
 *
 * Creates or links the Firebase user, creates the staff record with the owner role,
 * and prints a one-time password-setup link.
 */
import { parseArgs } from 'node:util';
import { connectDatabase, disconnectDatabase, syncIndexes } from '../lib/db.js';
import { firebaseAuth } from '../lib/firebase.js';
import { Staff } from '../models/Staff.js';
import { env } from '../config/env.js';

async function main() {
  const { values } = parseArgs({ options: { email: { type: 'string' }, name: { type: 'string' } } });
  const email = values.email?.trim().toLowerCase();
  const name = values.name?.trim() || 'Owner';
  if (!email || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
    throw new Error('Usage: npm run create-owner -- --email owner@example.com --name "Owner Name"');
  }

  await connectDatabase();
  await syncIndexes();
  const auth = firebaseAuth();

  let uid: string;
  try {
    const user = await auth.getUserByEmail(email);
    uid = user.uid;
    if (user.disabled) await auth.updateUser(uid, { disabled: false });
    console.log(`Found existing Firebase user for ${email}.`);
  } catch (err) {
    if ((err as { code?: string }).code !== 'auth/user-not-found') throw err;
    uid = (await auth.createUser({ email, displayName: name })).uid;
    console.log(`Created Firebase user for ${email}.`);
  }

  await Staff.findOneAndUpdate(
    { firebaseUid: uid },
    { $set: { email, displayName: name, role: 'owner', status: 'active' } },
    { upsert: true, returnDocument: 'after', runValidators: true },
  );

  const link = await auth.generatePasswordResetLink(email, { url: `${env.PUBLIC_SITE_URL.replace(/\/+$/, '')}/admin/login` });
  console.log(`\n${email} is now an active owner.`);
  console.log('Open this one-time link to set the password (do not share it):\n');
  console.log(link, '\n');
}

main()
  .catch((err) => {
    console.error(err instanceof Error ? err.message : err);
    process.exitCode = 1;
  })
  .finally(() => disconnectDatabase());
