/**
 * Build a URL for the dynamic Open Graph image at /api/og.
 * Pass the metadata to display on the social card.
 *
 * Use in metadata:
 *   openGraph: { images: [ogImage({ title: '...', subtitle: '...' }) ] }
 */
export function ogImage(params: {
  title?: string
  eyebrow?: string
  subtitle?: string
}): string {
  const sp = new URLSearchParams()
  if (params.title) sp.set('title', params.title)
  if (params.eyebrow) sp.set('eyebrow', params.eyebrow)
  if (params.subtitle) sp.set('subtitle', params.subtitle)
  const query = sp.toString()
  return query ? `/api/og?${query}` : '/api/og'
}
