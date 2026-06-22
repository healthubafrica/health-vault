'use client'

import { useEffect, useState } from 'react'
import { adminApi, type Testimonial } from '@/lib/api'
import { Card } from '@/components/ui/Card'
import { Pill } from '@/components/ui/Pill'
import { Button } from '@/components/ui/Button'
import { FormInput, FormSelect } from '@/components/ui/FormInput'
import { ImageUploadField } from '@/components/ui/ImageUploadField'
import { SkeletonBox } from '@/components/ui/Skeleton'
import { formatDate } from '@/lib/utils'
import { Plus, Pencil, Trash2, X, MessageSquareQuote, Star } from 'lucide-react'
import { toast } from 'sonner'

const EMPTY_FORM: Partial<Testimonial> = {
  authorName: '',
  authorTitle: '',
  authorCompany: '',
  authorPhotoUrl: '',
  quote: '',
  rating: 5,
  isFeatured: false,
  status: 'draft',
}

export default function TestimonialsPage() {
  const [testimonials, setTestimonials] = useState<Testimonial[]>([])
  const [loading, setLoading] = useState(true)
  const [modal, setModal] = useState<'add' | 'edit' | null>(null)
  const [editing, setEditing] = useState<Testimonial | null>(null)
  const [form, setForm] = useState<Partial<Testimonial>>(EMPTY_FORM)
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState<string | null>(null)
  const [confirmDelete, setConfirmDelete] = useState<Testimonial | null>(null)

  const load = async () => {
    setLoading(true)
    try {
      const res = await adminApi.cms.testimonials.list()
      setTestimonials(res.data)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  const openAdd = () => {
    setForm(EMPTY_FORM)
    setEditing(null)
    setModal('add')
  }

  const openEdit = (t: Testimonial) => {
    setForm({ ...t })
    setEditing(t)
    setModal('edit')
  }

  const closeModal = () => {
    setModal(null)
    setEditing(null)
    setForm(EMPTY_FORM)
  }

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    try {
      if (modal === 'add') {
        await adminApi.cms.testimonials.create(form)
        toast.success('Testimonial created')
      } else if (editing) {
        await adminApi.cms.testimonials.update(editing.id, form)
        toast.success('Testimonial updated')
      }
      closeModal()
      await load()
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Save failed')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async () => {
    if (!confirmDelete) return
    setDeleting(confirmDelete.id)
    try {
      await adminApi.cms.testimonials.delete(confirmDelete.id)
      toast.success('Testimonial deleted')
      setConfirmDelete(null)
      await load()
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Delete failed')
    } finally {
      setDeleting(null)
    }
  }

  const togglePublish = async (t: Testimonial) => {
    try {
      await adminApi.cms.testimonials.update(t.id, {
        status: t.status === 'published' ? 'draft' : 'published',
      })
      await load()
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Update failed')
    }
  }

  const field = (key: keyof Testimonial) => ({
    value: (form[key] as string) ?? '',
    onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
      setForm((prev) => ({ ...prev, [key]: e.target.value })),
  })

  return (
    <div className="max-w-[1100px]">
      <div className="flex items-center justify-between mb-5">
        <div>
          <h1 className="text-lg font-bold" style={{ color: 'var(--color-text)' }}>
            Testimonials
          </h1>
          <p className="text-sm mt-0.5" style={{ color: 'var(--color-text-muted)' }}>
            {testimonials.length} testimonials
          </p>
        </div>
        <Button size="sm" onClick={openAdd}>
          <Plus className="w-3.5 h-3.5" />
          Add Testimonial
        </Button>
      </div>

      <Card padding={false}>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b" style={{ borderColor: 'var(--color-border)' }}>
                {['Author', 'Quote', 'Rating', 'Featured', 'Status', 'Added', ''].map((h) => (
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
                    {[140, 220, 70, 70, 70, 80, 60].map((w, j) => (
                      <td key={j} className="px-4 py-3">
                        <SkeletonBox height={14} className="rounded" style={{ width: w }} />
                      </td>
                    ))}
                  </tr>
                ))
              ) : testimonials.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-16 text-center">
                    <MessageSquareQuote
                      className="w-8 h-8 mx-auto mb-3"
                      style={{ color: 'var(--color-text-faint)' }}
                    />
                    <p className="text-sm" style={{ color: 'var(--color-text-muted)' }}>
                      No testimonials yet
                    </p>
                    <button
                      className="text-sm mt-2 font-medium"
                      style={{ color: '#6DC43F' }}
                      onClick={openAdd}
                    >
                      Add the first testimonial
                    </button>
                  </td>
                </tr>
              ) : (
                testimonials.map((t) => (
                  <tr
                    key={t.id}
                    className="border-b last:border-b-0"
                    style={{ borderColor: 'var(--color-border)' }}
                  >
                    <td className="px-4 py-3">
                      <p className="font-medium" style={{ color: 'var(--color-text)' }}>
                        {t.authorName}
                      </p>
                      {(t.authorTitle || t.authorCompany) && (
                        <p className="text-xs mt-0.5" style={{ color: 'var(--color-text-faint)' }}>
                          {[t.authorTitle, t.authorCompany].filter(Boolean).join(' · ')}
                        </p>
                      )}
                    </td>
                    <td className="px-4 py-3 text-sm max-w-[280px]" style={{ color: 'var(--color-text-muted)' }}>
                      &ldquo;{t.quote.length > 90 ? t.quote.slice(0, 90) + '…' : t.quote}&rdquo;
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-0.5">
                        {Array.from({ length: 5 }).map((_, i) => (
                          <Star
                            key={i}
                            className="w-3 h-3"
                            fill={i < t.rating ? '#F5C518' : 'none'}
                            stroke={i < t.rating ? '#F5C518' : 'var(--color-text-faint)'}
                          />
                        ))}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      {t.isFeatured && <Pill variant="info">Featured</Pill>}
                    </td>
                    <td className="px-4 py-3">
                      <button onClick={() => togglePublish(t)}>
                        <Pill variant={t.status === 'published' ? 'success' : 'neutral'}>
                          {t.status === 'published' ? 'Published' : 'Draft'}
                        </Pill>
                      </button>
                    </td>
                    <td className="px-4 py-3 text-sm" style={{ color: 'var(--color-text-muted)' }}>
                      {formatDate(t.createdAt)}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1.5">
                        <button
                          onClick={() => openEdit(t)}
                          className="p-1.5 rounded-lg transition-colors hover:bg-[var(--color-bg)]"
                          style={{ color: 'var(--color-text-muted)' }}
                          title="Edit"
                        >
                          <Pencil className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => setConfirmDelete(t)}
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

      {/* Add / Edit modal */}
      {modal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0"
            style={{ background: 'rgba(0,0,0,0.6)' }}
            onClick={closeModal}
          />
          <div
            className="relative w-full max-w-lg rounded-2xl border shadow-2xl max-h-[90vh] overflow-y-auto"
            style={{ background: 'var(--color-surface)', borderColor: 'var(--color-border)' }}
          >
            <div
              className="flex items-center justify-between px-5 py-4 border-b sticky top-0"
              style={{ borderColor: 'var(--color-border)', background: 'var(--color-surface)' }}
            >
              <h2 className="text-sm font-semibold" style={{ color: 'var(--color-text)' }}>
                {modal === 'add' ? 'Add Testimonial' : 'Edit Testimonial'}
              </h2>
              <button onClick={closeModal} style={{ color: 'var(--color-text-muted)' }}>
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSave} className="p-5 space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <FormInput label="Author Name" required {...field('authorName')} />
                <FormInput label="Title" placeholder="e.g. Patient" {...field('authorTitle')} />
                <FormInput label="Company / Org" {...field('authorCompany')} />
              </div>

              <ImageUploadField
                label="Author Photo"
                value={form.authorPhotoUrl}
                onChange={(url) => setForm((p) => ({ ...p, authorPhotoUrl: url }))}
              />

              <div className="flex flex-col gap-1">
                <label className="text-[11px] font-semibold uppercase tracking-wider" style={{ color: 'var(--color-text-muted)' }}>
                  Quote
                </label>
                <textarea
                  required
                  rows={4}
                  value={form.quote ?? ''}
                  onChange={(e) => setForm((p) => ({ ...p, quote: e.target.value }))}
                  className="px-3 py-2 rounded-xl text-sm border outline-none transition-all duration-150 focus:border-[#6DC43F] focus:ring-2 focus:ring-[#6DC43F]/20 resize-none"
                  style={{
                    background: 'var(--color-surface)',
                    borderColor: 'var(--color-border)',
                    color: 'var(--color-text)',
                  }}
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <FormSelect
                  label="Rating"
                  value={form.rating ?? 5}
                  onChange={(e) => setForm((p) => ({ ...p, rating: parseInt(e.target.value, 10) }))}
                >
                  {[5, 4, 3, 2, 1].map((r) => (
                    <option key={r} value={r}>{r} star{r > 1 ? 's' : ''}</option>
                  ))}
                </FormSelect>
                <FormSelect
                  label="Status"
                  value={form.status ?? 'draft'}
                  onChange={(e) => setForm((p) => ({ ...p, status: e.target.value as 'draft' | 'published' }))}
                >
                  <option value="draft">Draft</option>
                  <option value="published">Published</option>
                </FormSelect>
              </div>

              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="isFeatured"
                  checked={form.isFeatured ?? false}
                  onChange={(e) => setForm((p) => ({ ...p, isFeatured: e.target.checked }))}
                  className="w-4 h-4 rounded"
                />
                <label htmlFor="isFeatured" className="text-sm" style={{ color: 'var(--color-text)' }}>
                  Feature on homepage
                </label>
              </div>

              <div
                className="flex justify-end gap-2 pt-3 border-t"
                style={{ borderColor: 'var(--color-border)' }}
              >
                <Button type="button" variant="secondary" size="sm" onClick={closeModal}>
                  Cancel
                </Button>
                <Button type="submit" size="sm" loading={saving}>
                  {modal === 'add' ? 'Create' : 'Save changes'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

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
              Delete testimonial?
            </h2>
            <p className="text-sm mb-5" style={{ color: 'var(--color-text-muted)' }}>
              The testimonial from{' '}
              <span className="font-medium" style={{ color: 'var(--color-text)' }}>
                {confirmDelete.authorName}
              </span>{' '}
              will be permanently removed. This action cannot be undone.
            </p>
            <div className="flex justify-end gap-2">
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setConfirmDelete(null)}
              >
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
