'use client';

import { useState } from 'react';
import Link from 'next/link';
import { ChevronDown } from 'lucide-react';

const INK = '#000000';
const INK_SOFT = 'rgba(0,0,0,0.65)';
const LINE = 'rgba(0,0,0,0.12)';

function AccordionSection({ id, title, openSection, onToggle, children }) {
  const isOpen = openSection === id;
  return (
    <div className="border-b sm:border-0" style={{ borderColor: LINE }}>
      <button
        type="button"
        onClick={() => onToggle(id)}
        className="w-full flex items-center justify-between py-3.5 sm:py-0 sm:mb-4 sm:pointer-events-none sm:cursor-default"
      >
        <span className="font-medium text-[11px] tracking-wide uppercase" style={{ color: INK_SOFT }}>
          {title}
        </span>
        <ChevronDown
          size={14}
          className="sm:hidden transition-transform duration-200"
          style={{ color: INK_SOFT, transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)' }}
        />
      </button>

      <div className={`${isOpen ? 'block' : 'hidden'} sm:!block pb-4 sm:pb-0`}>
        {children}
      </div>
    </div>
  );
}

export default function FooterLinks({ categories, quickLinks }) {
  const [openSection, setOpenSection] = useState(null);
  const toggle = (id) => setOpenSection((prev) => (prev === id ? null : id));

  return (
    <div className="sm:col-span-8 grid grid-cols-1 sm:grid-cols-8 gap-0 sm:gap-8">
      {/* Shop links */}
      <div className="sm:col-span-4">
        <AccordionSection id="shop" title="Shop" openSection={openSection} onToggle={toggle}>
          <ul className="space-y-2.5">
            {categories.map((cat) => (
              <li key={cat.slug}>
                <Link href={`/category/${cat.slug}`} className="text-[13px] transition-colors" style={{ color: INK }}>
                  <span className="hover:opacity-70 transition-opacity">{cat.name}</span>
                </Link>
              </li>
            ))}
          </ul>
        </AccordionSection>
      </div>

      {/* Quick links */}
      <div className="sm:col-span-4">
        <AccordionSection id="quicklinks" title="Quick Links" openSection={openSection} onToggle={toggle}>
          <ul className="space-y-2.5">
            {quickLinks.map((link) => (
              <li key={link.href}>
                <Link href={link.href} className="text-[13px] transition-colors" style={{ color: INK }}>
                  <span className="hover:opacity-70 transition-opacity">{link.label}</span>
                </Link>
              </li>
            ))}
          </ul>
        </AccordionSection>
      </div>
    </div>
  );
}