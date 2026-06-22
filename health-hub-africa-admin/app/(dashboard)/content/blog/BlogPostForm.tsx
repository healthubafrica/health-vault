'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { adminApi, type BlogPost } from '@/lib/api'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { FormInput, FormSelect } from '@/components/ui/FormInput'
import { ImageUploadField } from '@/components/ui/ImageUploadField'
import { RichTextEditor } from '@/components/ui/RichTextEditor'
import { ArrowLeft } from 'lucide-react'
import { toast } from 'sonner'

const CATEGORIES = [
  'Digital Health',
  'Health Tech',
  'Expert Review',
  'Telemedicine',
  'Emergency Care',
  'Preventive Care',
  'Data & Privacy',
  'Company News',
]

interface BlogPostFormProps {
  initial?: BlogPost
}

export function BlogPostForm({ initial }: BlogPostFormProps) {
  const router = useRouter()
  const isEdit = !!initial
  const [saving, setSaving] = useState(false)

  const [title, setTitle] = useState(initial?.title ?? '')
  const [slug, setSlug] = useState(initial?.slug ?? '')
  const [excerpt, setExcerpt] = useState(initial?.excerpt ?? '')
  const [bodyHtml, setBodyHtml] = useState(initial?.bodyHtml ?? '')
  const [coverImageUrl, setCoverImageUrl] = useState(initial?.coverImageUrl ?? '')
  const [category, setCategory] = useState(initial?.category ?? CATEGORIES[0])
  const [tags, setTags] = useState((initial?.tags ?? []).join(', '))
  const [authorName, setAuthorName] = useState(initial?.authorName ?? '')
  const [authorTitle, setAuthorTitle] = useState(initial?.authorTitle ?? '')
  const [readMinutes, setReadMinutes] = useState(initial?.readMinutes?.toString() ?? '')
  const [seoTitle, setSeoTitle] = useState(initial?.seoTitle ?? '')
  const [seoDescription, setSeoDescription] = useState(initial?.seoDescription ?? '')

  const buildPayload = (status: 'draft' | 'published'): Partial<BlogPost> => ({
    title,
    ...(isEdit && { slug }),
    excerpt,
    bodyHtml,
    coverImageUrl: coverImageUrl || undefined,
    category,
    tags: tags.split(',').map((t) => t.trim()).filter(Boolean),
    authorName,
    authorTitle: authorTitle || undefined,
    readMinutes: readMinutes ? parseInt(readMinutes, 10) : undefined,
    seoTitle: seoTitle || undefined,
    seoDescription: seoDescription || undefined,
    status,
  })

  const handleSave = async (status: 'draft' | 'published') => {
    if (!title.trim() || !excerpt.trim() || !bodyHtml.trim() || !authorName.trim()) {
      toast.error('Title, excerpt, body, and author are required')
      return
    }
    setSaving(true)
    try {
      const payload = buildPayload(status)
      if (isEdit) {
        await adminApi.cms.blog.update(initial.id, payload)
        toast.success('Post updated')
      } else {
        await adminApi.cms.blog.create(payload)
        toast.success(status === 'published' ? 'Post published' : 'Draft saved')
      }
      router.push('/content/blog')
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Save failed')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="max-w-[860px]">
      <button
        onClick={() => router.push('/content/blog')}
        className="flex items-center gap-1.5 text-sm mb-4"
        style={{ color: 'var(--color-text-muted)' }}
      >
        <ArrowLeft className="w-3.5 h-3.5" />
        Back to Blog Posts
      </button>

      <div className="flex items-center justify-between mb-5">
        <h1 className="text-lg font-bold" style={{ color: 'var(--color-text)' }}>
          {isEdit ? 'Edit Post' : 'New Post'}
        </h1>
        <div className="flex items-center gap-2">
          <Button variant="secondary" size="sm" loading={saving} onClick={() => handleSave('draft')}>
            Save Draft
          </Button>
          <Button size="sm" loading={saving} onClick={() => handleSave('published')}>
            {isEdit && initial?.status === 'published' ? 'Save changes' : 'Publish'}
          </Button>
        </div>
      </div>

      <Card className="space-y-4">
        <FormInput label="Title" required value={title} onChange={(e) => setTitle(e.target.value)} />

        {isEdit && (
          <FormInput
            label="Slug"
            value={slug}
            onChange={(e) => setSlug(e.target.value)}
            hint="Changing the slug breaks existing shared links"
          />
        )}

        <div className="flex flex-col gap-1">
          <label className="text-[11px] font-semibold uppercase tracking-wider" style={{ color: 'var(--color-text-muted)' }}>
            Excerpt
          </label>
          <textarea
            required
            rows={2}
            value={excerpt}
            onChange={(e) => setExcerpt(e.target.value)}
            className="px-3 py-2 rounded-xl text-sm border outline-none transition-all duration-150 focus:border-[#6DC43F] focus:ring-2 focus:ring-[#6DC43F]/20 resize-none"
            style={{ background: 'var(--color-surface)', borderColor: 'var(--color-border)', color: 'var(--color-text)' }}
          />
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-[11px] font-semibold uppercase tracking-wider" style={{ color: 'var(--color-text-muted)' }}>
            Body
          </label>
          <RichTextEditor value={bodyHtml} onChange={setBodyHtml} placeholder="Write the article…" />
        </div>

        <ImageUploadField label="Cover Image" value={coverImageUrl} onChange={setCoverImageUrl} />

        <div className="grid grid-cols-2 gap-3">
          <FormSelect label="Category" value={category} onChange={(e) => setCategory(e.target.value)}>
            {CATEGORIES.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </FormSelect>
          <FormInput
            label="Tags"
            placeholder="comma, separated, tags"
            value={tags}
            onChange={(e) => setTags(e.target.value)}
          />
        </div>

        <div className="grid grid-cols-3 gap-3">
          <FormInput label="Author Name" required value={authorName} onChange={(e) => setAuthorName(e.target.value)} />
          <FormInput label="Author Title" value={authorTitle} onChange={(e) => setAuthorTitle(e.target.value)} />
          <FormInput
            label="Read Minutes"
            type="number"
            min={1}
            value={readMinutes}
            onChange={(e) => setReadMinutes(e.target.value)}
          />
        </div>

        <div
          className="pt-3 border-t space-y-3"
          style={{ borderColor: 'var(--color-border)' }}
        >
          <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--color-text-faint)' }}>
            SEO (optional)
          </p>
          <FormInput
            label="SEO Title"
            value={seoTitle}
            onChange={(e) => setSeoTitle(e.target.value)}
            hint="Defaults to the post title when left blank"
          />
          <div className="flex flex-col gap-1">
            <label className="text-[11px] font-semibold uppercase tracking-wider" style={{ color: 'var(--color-text-muted)' }}>
              SEO Description
            </label>
            <textarea
              rows={2}
              value={seoDescription}
              onChange={(e) => setSeoDescription(e.target.value)}
              className="px-3 py-2 rounded-xl text-sm border outline-none transition-all duration-150 focus:border-[#6DC43F] focus:ring-2 focus:ring-[#6DC43F]/20 resize-none"
              style={{ background: 'var(--color-surface)', borderColor: 'var(--color-border)', color: 'var(--color-text)' }}
            />
          </div>
        </div>
      </Card>
    </div>
  )
}
