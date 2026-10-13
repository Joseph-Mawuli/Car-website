import { Link } from 'react-router';
import { ArrowRight } from 'lucide-react';

interface Brand {
  name: string;
  models: string;
  /** Inventory search for this brand. */
  to: string;
}

const search = (keyword: string) => `/cars?q=${encodeURIComponent(keyword)}`;

const POPULAR: Brand[] = [
  { name: 'Honda', models: 'CR-V, Civic, Accord, HR-V', to: search('Honda') },
  { name: 'Toyota', models: 'Corolla, Camry, Land Cruiser', to: search('Toyota') },
];

const LUXURY: Brand[] = [
  { name: 'Mercedes-Benz', models: 'Saloons and SUVs', to: search('Mercedes') },
  { name: 'Audi', models: 'Saloons and SUVs', to: search('Audi') },
  { name: 'BMW', models: 'Saloons and SUVs', to: search('BMW') },
  { name: 'Range Rover', models: 'All models', to: search('Range Rover') },
];

function BrandCard({ brand }: { brand: Brand }) {
  return (
    <li>
      <Link to={brand.to} className="card group flex h-full flex-col p-4 transition-colors hover:border-brand-500/60">
        <span className="font-display text-base font-bold group-hover:text-brand-600 dark:group-hover:text-brand-400">{brand.name}</span>
        <span className="mt-1 text-sm text-muted">{brand.models}</span>
      </Link>
    </li>
  );
}

function MoreCard() {
  return (
    <li>
      <Link
        to="/cars"
        className="flex h-full min-h-20 items-center justify-center gap-1 rounded-2xl border border-dashed border-line-strong p-4 text-sm font-semibold text-muted transition-colors hover:border-brand-500/60 hover:text-brand-600 dark:hover:text-brand-400"
      >
        And many more <ArrowRight className="h-4 w-4" aria-hidden />
      </Link>
    </li>
  );
}

export function BrandsSection() {
  return (
    <section aria-labelledby="brands-title" className="container-page mt-16">
      <p className="eyebrow">Brands we deal in</p>
      <h2 id="brands-title" className="mt-1 text-2xl font-bold sm:text-3xl">
        Our Top Models &amp; Luxury Brands
      </h2>
      <p className="mt-2 max-w-2xl text-sm text-muted">
        Brand new, foreign used and Ghanaian used vehicles, imported from the USA, Canada and Japan. Don't see the car you want? Tell us your budget and we'll find it.
      </p>

      <h3 className="mt-6 text-sm font-bold uppercase tracking-[0.16em] text-fg-soft">Top models</h3>
      <ul className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
        {POPULAR.map((b) => (
          <BrandCard key={b.name} brand={b} />
        ))}
        <MoreCard />
      </ul>

      <h3 className="mt-6 text-sm font-bold uppercase tracking-[0.16em] text-fg-soft">Luxury brands</h3>
      <ul className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        {LUXURY.map((b) => (
          <BrandCard key={b.name} brand={b} />
        ))}
        <MoreCard />
      </ul>
    </section>
  );
}
