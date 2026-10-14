'use client';

import ComboForm from '@/components/combo/ComboForm';

// Keeps `import ComboForm from '@/components/seller/ComboForm'` working.
export default function SellerComboForm(props) {
  return <ComboForm mode="seller" {...props} />;
}