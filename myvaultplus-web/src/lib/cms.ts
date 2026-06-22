const API_BASE = (process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000') + '/api/v1'

export interface CmsBlogPost {
  id: string
  title: string
  slug: string
  excerpt: string
  bodyHtml: string
  coverImageUrl?: string | null
  category: string
  tags: string[]
  publishedAt?: string | null
  authorName: string
  authorTitle?: string | null
  readMinutes?: number | null
  seoTitle?: string | null
  seoDescription?: string | null
}

export interface CmsTestimonial {
  id: string
  authorName: string
  authorTitle?: string | null
  authorCompany?: string | null
  authorPhotoUrl?: string | null
  quote: string
  rating: number
  isFeatured: boolean
}

export async function fetchBlogPosts(params?: {
  page?: number
  limit?: number
  category?: string
}): Promise<{ data: CmsBlogPost[]; meta: { total: number } }> {
  const qs = params
    ? '?' +
      new URLSearchParams(
        Object.entries(params)
          .filter(([, v]) => v !== undefined)
          .map(([k, v]) => [k, String(v)]),
      ).toString()
    : ''

  try {
    const res = await fetch(`${API_BASE}/cms/blog${qs}`, { next: { revalidate: 300 } })
    if (!res.ok) return { data: [], meta: { total: 0 } }
    return res.json()
  } catch {
    return { data: [], meta: { total: 0 } }
  }
}

export async function fetchBlogPostBySlug(slug: string): Promise<CmsBlogPost | null> {
  try {
    const res = await fetch(`${API_BASE}/cms/blog/${slug}`, { next: { revalidate: 300 } })
    if (!res.ok) return null
    const json = await res.json()
    return json.data
  } catch {
    return null
  }
}

export function formatBlogDate(dateISO?: string | null): string {
  if (!dateISO) return ''
  return new Date(dateISO).toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  })
}

export const FALLBACK_COVER_IMAGE =
  'https://images.unsplash.com/photo-1576091160550-2173dba999ef?w=1200&h=800&fit=crop&q=80'

export async function fetchTestimonials(): Promise<CmsTestimonial[]> {
  try {
    const res = await fetch(`${API_BASE}/cms/testimonials`, { next: { revalidate: 300 } })
    if (!res.ok) return []
    const json = await res.json()
    return json.data
  } catch {
    return []
  }
}
