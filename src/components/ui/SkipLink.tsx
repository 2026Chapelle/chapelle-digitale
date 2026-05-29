/**
 * Visible-on-focus skip link. First tabbable element on every page —
 * lets keyboard / screen-reader users jump past the Navbar and Sidebar
 * straight to the page's main content.
 *
 * Pairs with `<main id="main-content">` in each route-group layout.
 */
export function SkipLink() {
  return (
    <a
      href="#main-content"
      className="sr-only focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-[200] focus:px-4 focus:py-2 focus:rounded-lg focus:font-inter focus:text-sm focus:font-semibold focus:outline-none"
      style={{
        background: 'linear-gradient(135deg, #F5E6A7 0%, #D4AF37 50%, #92721A 100%)',
        color: '#1A0F00',
        boxShadow: '0 4px 16px rgba(212,175,55,0.45)',
      }}
    >
      Aller au contenu principal
    </a>
  )
}
