import { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Spanish Property Glossary — 30 Essential Terms | Avena Terminal',
  description:
    'Learn 30 essential Spanish property terms every investor needs to know. From NIE numbers to plusvalia tax, understand the language of buying property in Spain.',
  openGraph: {
    title: 'Spanish Property Glossary — 30 Essential Terms | Avena Terminal',
    description:
      'Learn 30 essential Spanish property terms every investor needs to know.',
    url: 'https://avenaterminal.com/glossary',
    siteName: 'Avena Terminal',
    type: 'website',
  },
  alternates: { canonical: 'https://avenaterminal.com/glossary' },
};

export const revalidate = 86400;

interface Term {
  slug: string;
  label: string;
}

const TERMS: Term[] = [
  { slug: 'arras-contract', label: 'Arras Contract' },
  { slug: 'autonomo-spain', label: 'Autónomo (Self-Employed) in Spain' },
  { slug: 'catastro', label: 'Catastro' },
  { slug: 'cedula-habitabilidad', label: 'Cédula de Habitabilidad' },
  { slug: 'community-fees', label: 'Community Fees' },
  { slug: 'contrato-compraventa', label: 'Contrato de Compraventa' },
  { slug: 'declaracion-renta', label: 'Declaración de la Renta' },
  { slug: 'escritura', label: 'Escritura' },
  { slug: 'gastos-notariales', label: 'Gastos Notariales' },
  { slug: 'gestor', label: 'Gestor' },
  { slug: 'golden-visa-spain', label: 'Golden Visa Spain' },
  { slug: 'hipoteca', label: 'Hipoteca (Mortgage)' },
  { slug: 'ibi-tax', label: 'IBI Tax' },
  { slug: 'impuesto-actos-juridicos', label: 'Impuesto de Actos Jurídicos Documentados' },
  { slug: 'impuesto-transmisiones', label: 'Impuesto de Transmisiones Patrimoniales' },
  { slug: 'iva-new-build', label: 'IVA on New Builds' },
  { slug: 'key-ready', label: 'Key Ready' },
  { slug: 'licencia-primera-ocupacion', label: 'Licencia de Primera Ocupación' },
  { slug: 'modelo-210', label: 'Modelo 210' },
  { slug: 'nie-number', label: 'NIE Number' },
  { slug: 'nota-simple', label: 'Nota Simple' },
  { slug: 'notario', label: 'Notario (Notary)' },
  { slug: 'off-plan', label: 'Off-Plan Property' },
  { slug: 'plusvalia-tax', label: 'Plusvalía Tax' },
  { slug: 'poder-notarial', label: 'Poder Notarial (Power of Attorney)' },
  { slug: 'referencia-catastral', label: 'Referencia Catastral' },
  { slug: 'registro-propiedad', label: 'Registro de la Propiedad' },
  { slug: 'residencia-fiscal', label: 'Residencia Fiscal' },
  { slug: 'sociedad-limitada', label: 'Sociedad Limitada (S.L.)' },
  { slug: 'tasacion', label: 'Tasación (Valuation)' },
];

export default function GlossaryPage() {
  // Group terms alphabetically
  const grouped: Record<string, Term[]> = {};
  for (const t of TERMS) {
    const letter = t.label[0].toUpperCase();
    if (!grouped[letter]) grouped[letter] = [];
    grouped[letter].push(t);
  }
  const letters = Object.keys(grouped).sort();

  return (
    <div className="min-h-screen bg-gray-950 text-gray-100">
      {/* Breadcrumbs */}
      <nav className="max-w-4xl mx-auto px-4 pt-6 text-sm text-gray-500">
        <Link href="/" className="hover:text-primary transition-colors">
          Home
        </Link>
        <span className="mx-2">/</span>
        <span className="text-gray-300">Glossary</span>
      </nav>

      <main className="max-w-4xl mx-auto px-4 py-10">
        <h1 className="text-3xl sm:text-4xl font-bold mb-2">
          Spanish Property Glossary
        </h1>
        <p className="text-gray-400 mb-10 text-lg">
          30 essential terms every property investor in Spain should understand.
        </p>

        {/* Letter quick-nav */}
        <div className="flex flex-wrap gap-2 mb-8">
          {letters.map((l) => (
            <a
              key={l}
              href={`#letter-${l}`}
              className="w-8 h-8 flex items-center justify-center rounded bg-gray-900 border border-gray-800 text-sm font-semibold hover:border-primary hover:text-primary transition-colors"
            >
              {l}
            </a>
          ))}
        </div>

        {/* Term list grouped by letter */}
        <div className="space-y-8">
          {letters.map((letter) => (
            <section key={letter} id={`letter-${letter}`}>
              <h2 className="text-xl font-bold text-primary mb-3 border-b border-gray-800 pb-1">
                {letter}
              </h2>
              <ul className="grid sm:grid-cols-2 gap-2">
                {grouped[letter].map((t) => (
                  <li key={t.slug}>
                    <Link
                      href={`/glossary/${t.slug}`}
                      className="block rounded-lg bg-gray-900 border border-gray-800 px-4 py-3 hover:border-primary hover:bg-gray-900/80 transition-colors"
                    >
                      <span className="font-medium text-white">{t.label}</span>
                      <span className="block text-xs text-gray-500 mt-0.5">
                        View definition &rarr;
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>

        {/* CTA */}
        <div className="mt-14 text-center">
          <Link
            href="/"
            className="inline-block bg-primary hover:bg-primary text-white font-semibold px-6 py-3 rounded-lg transition-colors"
          >
            Browse Spanish New Build Properties
          </Link>
        </div>
      </main>
    </div>
  );
}
