// Run with: node scripts/seed.js
// Creates (or updates) the first superadmin account from env vars.
import 'dotenv/config';
import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import Admin from '../models/Admin.js';

const MONGODB_URI = process.env.MONGODB_URI;
const ADMIN_EMAIL = process.env.ADMIN_EMAIL;
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD;

async function seed() {
  if (!MONGODB_URI) {
    console.error('MONGODB_URI is not set.');
    process.exit(1);
  }
  if (!ADMIN_EMAIL || !ADMIN_PASSWORD) {
    console.error('ADMIN_EMAIL and ADMIN_PASSWORD must be set in .env');
    process.exit(1);
  }

  await mongoose.connect(MONGODB_URI);
  console.log('Connected to MongoDB.');

  const existing = await Admin.findOne({ email: ADMIN_EMAIL.toLowerCase().trim() });
  const passwordHash = await bcrypt.hash(ADMIN_PASSWORD, 10);

  if (existing) {
    existing.passwordHash = passwordHash;
    existing.role = 'superadmin';
    await existing.save();
    console.log(`Updated existing account "${existing.email}" to superadmin.`);
  } else {
    const admin = await Admin.create({
      name: 'Super Admin',
      email: ADMIN_EMAIL.toLowerCase().trim(),
      passwordHash,
      role: 'superadmin',
    });
    console.log(`Created superadmin account "${admin.email}".`);
  }

  await mongoose.disconnect();
  console.log('Done.');
}

seed().catch((err) => {
  console.error('Seed failed:', err);
  process.exit(1);
});