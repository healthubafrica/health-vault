'use client'

import { useEffect, useState } from 'react'
import { adminApi, type Facility } from '@/lib/api'
import { Card } from '@/components/ui/Card'
import { Pill } from '@/components/ui/Pill'
import { Button } from '@/components/ui/Button'
import { FormInput } from '@/components/ui/FormInput'
import { SkeletonBox } from '@/components/ui/Skeleton'
import { formatDate } from '@/lib/utils'
import { Plus, Pencil, Trash2, X, Building2 } from 'lucide-react'
import { toast } from 'sonner'

const EMPTY_FORM: Partial<Facility> = {
  name: '',
  type: '',
  address: '',
  city: '',
  state: '',
  country: 'Nigeria',
  phone: '',
  email: '',
  isActive: true,
}

export default function FacilitiesPage() {
  const [facilities, setFacilities] = useState<Facility[]>([])
  const [loading, setLoading] = useState(true)
  const [modal, setModal] = useState<'add' | 'edit' | null>(null)
  const [editing, setEditing] = useState<Facility | null>(null)
  const [form, setForm] = useState<Partial<Facility>>(EMPTY_FORM)
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState<string | null>(null)
  const [confirmDelete, setConfirmDelete] = useState<Facility | null>(null)

  const load = async () => {
    setLoading(true)
    try {
      const res = await adminApi.facilities.list()
      setFacilities(res.data)
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

  const openEdit = (f: Facility) => {
    setForm({ ...f })
    setEditing(f)
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
        await adminApi.facilities.create(form)
        toast.success('Facility created')
      } else if (editing) {
        await adminApi.facilities.update(editing.id, form)
        toast.success('Facility updated')
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
      await adminApi.facilities.delete(confirmDelete.id)
      toast.success('Facility deleted')
      setConfirmDelete(null)
      await load()
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Delete failed')
    } finally {
      setDeleting(null)
    }
  }

  const field = (key: keyof Facility) => ({
    value: (form[key] as string) ?? '',
    onChange: (e: React.ChangeEvent<HTMLInputElement>) =>
      setForm((prev) => ({ ...prev, [key]: e.target.value })),
  })

  return (
    <div className="max-w-[1100px]">
      <div className="flex items-center justify-between mb-5">
        <div>
          <h1 className="text-lg font-bold" style={{ color: 'var(--color-text)' }}>
            Facilities
          </h1>
          <p className="text-sm mt-0.5" style={{ color: 'var(--color-text-muted)' }}>
            {facilities.length} facilities registered
          </p>
        </div>
        <Button size="sm" onClick={openAdd}>
          <Plus className="w-3.5 h-3.5" />
          Add Facility
        </Button>
      </div>

      <Card padding={false}>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b" style={{ borderColor: 'var(--color-border)' }}>
                {['Name', 'Type', 'Location', 'Status', 'Added', ''].map((h) => (
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
                    {[180, 80, 140, 60, 80, 60].map((w, j) => (
                      <td key={j} className="px-4 py-3">
                        <SkeletonBox height={14} className="rounded" style={{ width: w }} />
                      </td>
                    ))}
                  </tr>
                ))
              ) : facilities.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-16 text-center">
                    <Building2
                      className="w-8 h-8 mx-auto mb-3"
                      style={{ color: 'var(--color-text-faint)' }}
                    />
                    <p className="text-sm" style={{ color: 'var(--color-text-muted)' }}>
                      No facilities yet
                    </p>
                    <button
                      className="text-sm mt-2 font-medium"
                      style={{ color: '#6DC43F' }}
                      onClick={openAdd}
                    >
                      Add the first facility
                    </button>
                  </td>
                </tr>
              ) : (
                facilities.map((f) => (
                  <tr
                    key={f.id}
                    className="border-b last:border-b-0"
                    style={{ borderColor: 'var(--color-border)' }}
                  >
                    <td className="px-4 py-3">
                      <p className="font-medium" style={{ color: 'var(--color-text)' }}>
                        {f.name}
                      </p>
                      {f.email && (
                        <p className="text-xs mt-0.5" style={{ color: 'var(--color-text-faint)' }}>
                          {f.email}
                        </p>
                      )}
                    </td>
                    <td className="px-4 py-3 text-sm" style={{ color: 'var(--color-text-muted)' }}>
                      {f.type}
                    </td>
                    <td className="px-4 py-3 text-sm" style={{ color: 'var(--color-text-muted)' }}>
                      {[f.city, f.state].filter(Boolean).join(', ')}
                    </td>
                    <td className="px-4 py-3">
                      <Pill variant={f.isActive ? 'success' : 'neutral'}>
                        {f.isActive ? 'Active' : 'Inactive'}
                      </Pill>
                    </td>
                    <td className="px-4 py-3 text-sm" style={{ color: 'var(--color-text-muted)' }}>
                      {formatDate(f.createdAt)}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1.5">
                        <button
                          onClick={() => openEdit(f)}
                          className="p-1.5 rounded-lg transition-colors hover:bg-[var(--color-bg)]"
                          style={{ color: 'var(--color-text-muted)' }}
                          title="Edit"
                        >
                          <Pencil className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => setConfirmDelete(f)}
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
            className="relative w-full max-w-lg rounded-2xl border shadow-2xl"
            style={{ background: 'var(--color-surface)', borderColor: 'var(--color-border)' }}
          >
            <div
              className="flex items-center justify-between px-5 py-4 border-b"
              style={{ borderColor: 'var(--color-border)' }}
            >
              <h2 className="text-sm font-semibold" style={{ color: 'var(--color-text)' }}>
                {modal === 'add' ? 'Add Facility' : 'Edit Facility'}
              </h2>
              <button onClick={closeModal} style={{ color: 'var(--color-text-muted)' }}>
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSave} className="p-5 space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div className="col-span-2">
                  <FormInput label="Name" required {...field('name')} />
                </div>
                <FormInput label="Type" placeholder="e.g. Hospital, Clinic" required {...field('type')} />
                <FormInput label="Phone" {...field('phone')} />
                <div className="col-span-2">
                  <FormInput label="Address" {...field('address')} />
                </div>
                <FormInput label="City" required {...field('city')} />
                <FormInput label="State" required {...field('state')} />
                <FormInput label="Country" required {...field('country')} />
                <FormInput label="Email" type="email" {...field('email')} />
              </div>

              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="isActive"
                  checked={form.isActive ?? true}
                  onChange={(e) => setForm((p) => ({ ...p, isActive: e.target.checked }))}
                  className="w-4 h-4 rounded"
                />
                <label htmlFor="isActive" className="text-sm" style={{ color: 'var(--color-text)' }}>
                  Active
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
              Delete facility?
            </h2>
            <p className="text-sm mb-5" style={{ color: 'var(--color-text-muted)' }}>
              <span className="font-medium" style={{ color: 'var(--color-text)' }}>
                {confirmDelete.name}
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
