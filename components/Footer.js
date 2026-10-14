import { MapPin, Phone, Mail } from 'lucide-react';
import { Fraunces, Inter } from 'next/font/google';
import { dbConnect } from '@/lib/mongodb';
import Category from '@/models/Category';
import FooterLinks from './FooterLinks';

const display = Fraunces({ subsets: ['latin'], weight: ['400'], variable: '--font-display' });
const body = Inter({ subsets: ['latin'], weight: ['400', '500'], variable: '--font-body' });

const PAPER = '#FFFFFF';
const GOLD = '#C9A227';
const INK = '#000000';
const INK_SOFT = 'rgba(0,0,0,0.65)';
const LINE = 'rgba(0,0,0,0.12)';

const BRAND = 'Digital World';
const EMAIL = 'Kannammasnacks@gmail.com';
const PHONE = '7010693674';
const ADDRESS = 'Tamil Nadu';

async function getCategories() {
  await dbConnect();
  const categories = await Category.find({}).select('name slug').lean();
  return JSON.parse(JSON.stringify(categories));
}

export default async function Footer() {
  const whatsapp = process.env.NEXT_PUBLIC_WHATSAPP || `91${PHONE}`;
  const instagram = process.env.NEXT_PUBLIC_INSTAGRAM || '';
  const categories = await getCategories();

  const quickLinks = [
    { label: 'Home', href: '/' },
    { label: 'Shop', href: '/shop' },
    { label: 'Wishlist', href: '/wishlist' },
    { label: 'Contact', href: '/contact' },
  ];

  return (
    <footer
      className={`${body.className} mt-16`}
      style={{ background: PAPER, borderTop: `1px solid ${GOLD}` }}
    >
      <div className="max-w-7xl mx-auto px-4 py-14 grid grid-cols-1 sm:grid-cols-12 gap-10 sm:gap-8">

        {/* Brand column */}
        <div className="sm:col-span-4">
          <h3 className={`${display.className} text-2xl leading-tight mb-4`} style={{ color: INK, fontWeight: 400 }}>
            {BRAND}
          </h3>

          <p className="flex items-start gap-1.5 text-xs leading-relaxed" style={{ color: INK_SOFT }}>
            <MapPin size={13} className="shrink-0 mt-0.5" style={{ color: GOLD }} />
            {ADDRESS}
          </p>

          <a
            href={`tel:+91${PHONE}`}
            className="flex items-center gap-1.5 mt-2 text-xs transition-opacity hover:opacity-75"
            style={{ color: INK_SOFT }}
          >
            <Phone size={13} className="shrink-0" style={{ color: GOLD }} />
            +91 {PHONE}
          </a>

          <a
            href={`mailto:${EMAIL}`}
            className="flex items-center gap-1.5 mt-2 text-xs transition-opacity hover:opacity-75 break-all"
            style={{ color: INK_SOFT }}
          >
            <Mail size={13} className="shrink-0" style={{ color: GOLD }} />
            {EMAIL}
          </a>
        </div>

        <FooterLinks categories={categories} quickLinks={quickLinks} whatsapp={whatsapp} instagram={instagram} />
      </div>

      {/* Bottom bar */}
      <div style={{ borderTop: `1px solid ${LINE}` }}>
        <div className="max-w-7xl mx-auto px-4 py-4 flex flex-col sm:flex-row items-center justify-between gap-2">
          <p className="text-[11px]" style={{ color: INK_SOFT }}>
            © {new Date().getFullYear()} {BRAND}. All rights reserved.
          </p>

          <a
            href="https://www.nexirasolution.in"
            target="_blank"
            rel="noreferrer"
            className="flex items-center gap-1.5 text-[11px] transition-opacity hover:opacity-75"
            style={{ color: INK_SOFT }}
          >
            Designed & developed by
            <span className="font-medium text-[11px] tracking-wide" style={{ color: INK }}>
              Nexira Solution
            </span>
          </a>
        </div>
      </div>
    </footer>
  );
}