'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { adminApi, type BlogPost } from '@/lib/api'
import { Card } from '@/components/ui/Card'
import { Pill } from '@/components/ui/Pill'
import { Button } from '@/components/ui/Button'
import { SkeletonBox } from '@/components/ui/Skeleton'
import { formatDate } from '@/lib/utils'
import { Plus, Pencil, Trash2, Newspaper } from 'lucide-react'
import { toast } from 'sonner'

export default function BlogPostsPage() {
  const router = useRouter()
  const [posts, setPosts] = useState<BlogPost[]>([])
  const [loading, setLoading] = useState(true)
  const [deleting, setDeleting] = useState<string | null>(null)
  const [confirmDelete, setConfirmDelete] = useState<BlogPost | null>(null)

  const load = async () => {
    setLoading(true)
    try {
      const res = await adminApi.cms.blog.list()
      setPosts(res.data)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  const handleDelete = async () => {
    if (!confirmDelete) return
    setDeleting(confirmDelete.id)
    try {
      await adminApi.cms.blog.delete(confirmDelete.id)
      toast.success('Post deleted')
      setConfirmDelete(null)
      await load()
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Delete failed')
    } finally {
      setDeleting(null)
    }
  }

  const togglePublish = async (post: BlogPost) => {
    try {
      await adminApi.cms.blog.update(post.id, {
        status: post.status === 'published' ? 'draft' : 'published',
      })
      await load()
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Update failed')
    }
  }

  return (
    <div className="max-w-[1100px]">
      <div className="flex items-center justify-between mb-5">
        <div>
          <h1 className="text-lg font-bold" style={{ color: 'var(--color-text)' }}>
            Blog Posts
          </h1>
          <p className="text-sm mt-0.5" style={{ color: 'var(--color-text-muted)' }}>
            {posts.length} posts
          </p>
        </div>
        <Button size="sm" onClick={() => router.push('/content/blog/new')}>
          <Plus className="w-3.5 h-3.5" />
          New Post
        </Button>
      </div>

      <Card padding={false}>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b" style={{ borderColor: 'var(--color-border)' }}>
                {['Title', 'Category', 'Author', 'Status', 'Updated', ''].map((h) => (
                  <th
                    key={h}
                    className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wider"
                    style={{ color: 'var(--color-text-muted)' }}
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i} className="border-b" style={{ borderColor: 'var(--color-border)' }}>
                    {[220, 100, 120, 80, 90, 60].map((w, j) => (
                      <td key={j} className="px-4 py-3">
                        <SkeletonBox height={14} className="rounded" style={{ width: w }} />
                      </td>
                    ))}
                  </tr>
                ))
              ) : posts.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-16 text-center">
                    <Newspaper
                      className="w-8 h-8 mx-auto mb-3"
                      style={{ color: 'var(--color-text-faint)' }}
                    />
                    <p className="text-sm" style={{ color: 'var(--color-text-muted)' }}>
                      No blog posts yet
                    </p>
                    <Link
                      href="/content/blog/new"
                      className="text-sm mt-2 font-medium inline-block"
                      style={{ color: '#6DC43F' }}
                    >
                      Write the first post
                    </Link>
                  </td>
                </tr>
              ) : (
                posts.map((post) => (
                  <tr
                    key={post.id}
                    className="border-b last:border-b-0"
                    style={{ borderColor: 'var(--color-border)' }}
                  >
                    <td className="px-4 py-3">
                      <p className="font-medium" style={{ color: 'var(--color-text)' }}>
                        {post.title}
                      </p>
                      <p className="text-xs mt-0.5" style={{ color: 'var(--color-text-faint)' }}>
                        /blog/{post.slug}
                      </p>
                    </td>
                    <td className="px-4 py-3 text-sm" style={{ color: 'var(--color-text-muted)' }}>
                      {post.category}
                    </td>
                    <td className="px-4 py-3 text-sm" style={{ color: 'var(--color-text-muted)' }}>
                      {post.authorName}
                    </td>
                    <td className="px-4 py-3">
                      <button onClick={() => togglePublish(post)}>
                        <Pill variant={post.status === 'published' ? 'success' : 'neutral'}>
                          {post.status === 'published' ? 'Published' : 'Draft'}
                        </Pill>
                      </button>
                    </td>
                    <td className="px-4 py-3 text-sm" style={{ color: 'var(--color-text-muted)' }}>
                      {formatDate(post.updatedAt)}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1.5">
                        <Link
                          href={`/content/blog/${post.id}`}
                          className="p-1.5 rounded-lg transition-colors hover:bg-[var(--color-bg)] inline-flex"
                          style={{ color: 'var(--color-text-muted)' }}
                          title="Edit"
                        >
                          <Pencil className="w-3.5 h-3.5" />
                        </Link>
                        <button
                          onClick={() => setConfirmDelete(post)}
                          className="p-1.5 rounded-lg transition-colors hover:bg-[var(--color-error-bg)]"
                          style={{ color: 'var(--color-emergency)' }}
                          title="Delete"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Delete confirmation */}
      {confirmDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0"
            style={{ background: 'rgba(0,0,0,0.6)' }}
            onClick={() => setConfirmDelete(null)}
          />
          <div
            className="relative w-full max-w-sm rounded-2xl border p-5 shadow-2xl"
            style={{ background: 'var(--color-surface)', borderColor: 'var(--color-border)' }}
          >
            <h2 className="text-sm font-semibold mb-2" style={{ color: 'var(--color-text)' }}>
              Delete post?
            </h2>
            <p className="text-sm mb-5" style={{ color: 'var(--color-text-muted)' }}>
              <span className="font-medium" style={{ color: 'var(--color-text)' }}>
                {confirmDelete.title}
              </span>{' '}
              will be permanently removed. This action cannot be undone.
            </p>
            <div className="flex justify-end gap-2">
              <Button variant="secondary" size="sm" onClick={() => setConfirmDelete(null)}>
                Cancel
              </Button>
              <Button
                variant="danger"
                size="sm"
                loading={deleting === confirmDelete.id}
                onClick={handleDelete}
              >
                Delete
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
