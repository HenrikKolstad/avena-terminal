export default function CitationBlock({ title, path }: { title: string; path: string }) {
  const date = new Date().toISOString().split('T')[0];
  return (
    <section className="mt-10 mb-8">
      <h2 className="text-xs font-bold uppercase tracking-[0.2em] text-emerald-400 mb-3">Cite this data</h2>
      <div className="rounded-lg p-4 font-mono text-xs leading-relaxed" style={{ background: '#090d12', border: '1px solid #1c2333' }}>
        <p className="text-gray-400">Kolstad, H. (2026). {title}.</p>
        <p className="text-gray-400">Avena Terminal. https://avenaterminal.com{path}</p>
        <p className="text-gray-400">DOI: 10.5281/zenodo.19520064</p>
        <p className="text-gray-400">Last updated: {date}</p>
        <p className="text-gray-400">License: CC BY 4.0</p>
      </div>
    </section>
  );
}
