import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { NextResponse } from 'next/server';
import { randomUUID } from 'crypto';
import { getAdminFromRequest } from '@/lib/auth';
import { dbConnect } from '@/lib/mongodb';
import Admin from '@/models/Admin';

export const runtime = 'nodejs';

const r2 = new S3Client({
  region: 'auto',
  endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY,
  },
});

const MAX_SIZE = 4 * 1024 * 1024; // stays under Vercel's ~4.5 MB body limit
const ALLOWED_FOLDERS = ['products', 'size-charts', 'addons', 'uploads'];

// R2 stores whatever you give it, so detect the real type from the file's
// first bytes instead of trusting the client-supplied file.type.
function sniffImageType(buf) {
  if (buf.length >= 3 && buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) {
    return { contentType: 'image/jpeg', ext: 'jpg' };
  }
  if (
    buf.length >= 8 &&
    buf.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))
  ) {
    return { contentType: 'image/png', ext: 'png' };
  }
  if (buf.length >= 6 && buf.subarray(0, 4).toString('ascii') === 'GIF8') {
    return { contentType: 'image/gif', ext: 'gif' };
  }
  if (
    buf.length >= 12 &&
    buf.subarray(0, 4).toString('ascii') === 'RIFF' &&
    buf.subarray(8, 12).toString('ascii') === 'WEBP'
  ) {
    return { contentType: 'image/webp', ext: 'webp' };
  }
  return null;
}

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
  if (file.size > MAX_SIZE) {
    return NextResponse.json({ error: 'Image must be under 4 MB' }, { status: 400 });
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  const detected = sniffImageType(buffer);
  if (!detected) {
    return NextResponse.json(
      { error: 'Only JPEG, PNG, WebP or GIF images are allowed' },
      { status: 400 }
    );
  }

  const requested = formData.get('folder');
  const folder = ALLOWED_FOLDERS.includes(requested) ? requested : 'uploads';
  const key = `${folder}/${randomUUID()}.${detected.ext}`;

  // 4. Upload to Cloudflare R2
  try {
    await r2.send(
      new PutObjectCommand({
        Bucket: process.env.R2_BUCKET_NAME,
        Key: key,
        Body: buffer,
        ContentType: detected.contentType,
        CacheControl: 'public, max-age=31536000, immutable',
      })
    );

    const base = process.env.R2_PUBLIC_URL.replace(/\/+$/, '');
    // `publicId` kept so existing client code that reads it keeps working
    return NextResponse.json({ url: `${base}/${key}`, publicId: key });
  } catch (err) {
    console.error('R2 upload failed:', err);
    return NextResponse.json({ error: 'Upload failed' }, { status: 500 });
  }
}