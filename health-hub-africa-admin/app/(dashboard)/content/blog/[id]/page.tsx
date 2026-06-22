'use client'

import { useEffect, useState, use } from 'react'
import { adminApi, type BlogPost } from '@/lib/api'
import { SkeletonBox } from '@/components/ui/Skeleton'
import { BlogPostForm } from '../BlogPostForm'

export default function EditBlogPostPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const [post, setPost] = useState<BlogPost | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    adminApi.cms.blog.get(id)
      .then((res) => setPost(res.data))
      .finally(() => setLoading(false))
  }, [id])

  if (loading) {
    return (
      <div className="max-w-[860px] space-y-3">
        <SkeletonBox height={18} width={140} />
        <SkeletonBox height={300} className="rounded-2xl" />
      </div>
    )
  }

  if (!post) {
    return <p style={{ color: 'var(--color-text-muted)' }}>Post not found.</p>
  }

  return <BlogPostForm initial={post} />
}
