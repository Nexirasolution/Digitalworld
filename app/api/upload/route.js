import { v2 as cloudinary } from 'cloudinary';
import { NextResponse } from 'next/server';
import { randomUUID } from 'crypto';
import { getAdminFromRequest } from '@/lib/auth';
import { dbConnect } from '@/lib/mongodb';
import Admin from '@/models/Admin';

export const runtime = 'nodejs';

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
  secure: true,
});

const MAX_SIZE = 4 * 1024 * 1024; // stays under Vercel's ~4.5 MB body limit
const ALLOWED_FOLDERS = ['products', 'size-charts', 'addons', 'uploads'];

export async function POST(req) {
  // 1. Must be logged in
  const tokenAdmin = getAdminFromRequest(req);
  if (!tokenAdmin) {
    return NextResponse.json({ error: 'Unauthorized. Please login.' }, { status: 401 });
  }

  // 2. Superadmins pass; sellers must be approved (re-checked in the DB)
  if (tokenAdmin.role !== 'superadmin') {
    if (tokenAdmin.role !== 'seller') {
      return NextResponse.json({ error: 'Forbidden.' }, { status: 403 });
    }
    await dbConnect();
    const admin = await Admin.findById(tokenAdmin.id).select('status').lean();
    if (!admin) {
      return NextResponse.json({ error: 'Account not found.' }, { status: 401 });
    }
    if (admin.status !== 'approved') {
      return NextResponse.json(
        { error: 'Your seller account is not approved yet.' },
        { status: 403 }
      );
    }
  }

  // 3. Validate the file
  const formData = await req.formData();
  const file = formData.get('file');

  if (!file || typeof file === 'string') {
    return NextResponse.json({ error: 'No file' }, { status: 400 });
  }
  if (!file.type?.startsWith('image/')) {
    return NextResponse.json({ error: 'Only image files are allowed' }, { status: 400 });
  }
  if (file.size > MAX_SIZE) {
    return NextResponse.json({ error: 'Image must be under 4 MB' }, { status: 400 });
  }

  const requested = formData.get('folder');
  const folder = ALLOWED_FOLDERS.includes(requested) ? requested : 'uploads';
  const buffer = Buffer.from(await file.arrayBuffer());

  // 4. Upload to Cloudinary
  try {
    const result = await new Promise((resolve, reject) => {
      cloudinary.uploader
        .upload_stream(
          { folder, public_id: randomUUID(), resource_type: 'image' },
          (error, res) => (error ? reject(error) : resolve(res))
        )
        .end(buffer);
    });

    return NextResponse.json({ url: result.secure_url, publicId: result.public_id });
  } catch (err) {
    console.error('Cloudinary upload failed:', err);
    return NextResponse.json({ error: 'Upload failed' }, { status: 500 });
  }
}