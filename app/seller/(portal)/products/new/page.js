import ProductForm from '@/components/seller/ProductForm';

const INK = '#000000';
const PAPER = '#FFFFFF';

export default function NewSellerProductPage() {
  return (
    <div className="max-w-3xl mx-auto px-6 py-10" style={{ background: PAPER }}>
      <h1 className="text-[18px] tracking-[1.5px] uppercase mb-6" style={{ color: INK }}>
        Add Product
      </h1>
      <ProductForm />
    </div>
  );
}