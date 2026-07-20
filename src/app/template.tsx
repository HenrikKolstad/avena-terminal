/**
 * Route template (2026-07-20) — remounts on every navigation, giving each
 * page a gentle rise-and-fade entrance so moving between the deals, a
 * property and back feels like turning pages rather than swapping them.
 * Disabled under prefers-reduced-motion (see globals.css).
 */

export default function Template({ children }: { children: React.ReactNode }) {
  return <div className="av-page-enter">{children}</div>;
}
