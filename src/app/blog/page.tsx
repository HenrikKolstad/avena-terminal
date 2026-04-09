import { Metadata } from 'next';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';

export const metadata: Metadata = {
  title: 'Spain Property Investment Blog | Avena Estate',
  description: 'Weekly insights on Spanish new build investment, rental yields, Costa Blanca & Costa del Sol market analysis.',
  openGraph: {
    title: 'Spain Property Investment Blog | Avena Estate',
    description: 'Weekly insights on Spanish new build investment, rental yields, and market analysis.',
    url: 'https://avena-estate.com/blog',
    siteName: 'Avena Estate',
    type: 'website',
  },
};

interface BlogPost {
  id: string;
  slug: string;
  title: string;
  excerpt: string | null;
  cover_image: string | null;
  published_at: string;
}

export const revalidate = 60;

async function getPosts(): Promise<BlogPost[]> {
  if (!supabase) return [];
  const { data, error } = await supabase
    .from('blogs')
    .select('id, slug, title, excerpt, cover_image, published_at')
    .eq('published', true)
    .order('published_at', { ascending: false });
  if (error || !data) return [];
  return data;
}

export default async function BlogPage() {
  const posts = await getPosts();

  return (
    <div className="min-h-screen text-gray-100" style={{ background: 'linear-gradient(180deg, #0a1628 0%, #0d1117 8%, #0d1117 100%)' }}>
      {/* Header */}
      <header className="border-b sticky top-0 z-50 backdrop-blur-sm" style={{ borderColor: '#1c2333', background: 'rgba(13,17,23,0.85)' }}>
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-3 hover:opacity-80 transition-opacity">
            <h1 className="text-xl font-bold font-serif tracking-[0.15em] bg-gradient-to-r from-emerald-300 via-emerald-400 to-emerald-600 bg-clip-text text-transparent">AVENA</h1>
          </Link>
          <Link href="/" className="text-sm text-gray-400 hover:text-white transition-colors">← Back to Terminal</Link>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4">
        {/* Hero */}
        <div className="py-12 md:py-16 text-center border-b" style={{ borderColor: '#1c2333' }}>
          <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold mb-3" style={{ background: 'linear-gradient(135deg, #00b9ff, #9fe870)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>Spain Property Investment Insights</h1>
          <p className="text-gray-400 text-sm md:text-base max-w-xl mx-auto">Data-driven analysis from 1,867 scored new builds across Costa Blanca, Costa del Sol, and Costa Calida.</p>
        </div>
        <div className="py-10">

        {posts.length === 0 ? (
          <div className="text-center py-20">
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="url(#bg)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="mx-auto mb-4">
              <defs><linearGradient id="bg" x1="0" y1="0" x2="24" y2="24"><stop offset="0%" stopColor="#00b9ff"/><stop offset="100%" stopColor="#9fe870"/></linearGradient></defs>
              <path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 013 3L7 19l-4 1 1-4L16.5 3.5z"/>
            </svg>
            <h2 className="text-xl font-semibold text-white mb-2">Coming soon</h2>
            <p className="text-gray-500">Weekly investment insights — launching shortly.</p>
          </div>
        ) : (
          <div className="grid gap-8">
            {posts.map((post) => (
              <Link key={post.id} href={`/blog/${post.slug}`} className="group block">
                <article className="rounded-2xl overflow-hidden border transition-all duration-300 hover:border-[#00b9ff30]" style={{ background: 'linear-gradient(145deg, #0f1922 0%, #0d1117 100%)', borderColor: '#1c2333' }}>
                  {post.cover_image && (
                    <div className="aspect-[3/1] overflow-hidden">
                      <img src={post.cover_image} alt={post.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                    </div>
                  )}
                  <div className="p-6">
                    <time className="text-xs text-gray-500 mb-2 block">
                      {new Date(post.published_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}
                    </time>
                    <h2 className="text-xl font-bold text-white mb-2 group-hover:text-[#60a5fa] transition-colors">{post.title}</h2>
                    {post.excerpt && <p className="text-gray-400 text-sm line-clamp-2">{post.excerpt}</p>}
                    <span className="inline-block mt-4 text-sm font-semibold" style={{ background: 'linear-gradient(135deg, #00b9ff, #9fe870)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>Read more →</span>
                  </div>
                </article>
              </Link>
            ))}
          </div>
        )}
        </div>{/* end content section */}
      </main>

      {/* Divider */}
      <div className="h-px w-full" style={{ background: 'linear-gradient(90deg, transparent, #00b9ff40, #9fe87040, transparent)' }} />

      <footer className="py-6 text-center text-gray-600 text-xs">
        © 2026 Avena Estate · <a href="https://avena-estate.com" className="text-gray-500 hover:text-gray-300">avena-estate.com</a>
      </footer>
    </div>
  );
}
