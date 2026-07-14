'use client'

import { useEffect, useState, useCallback } from 'react'
import { providerSelf, type ProviderProfile, type ProviderProfileUpdate } from '@/lib/api'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Pill } from '@/components/ui/Pill'
import { FormInput } from '@/components/ui/FormInput'
import { Avatar } from '@/components/ui/Avatar'
import { SkeletonBox } from '@/components/ui/Skeleton'
import { useAuthStore } from '@/lib/stores/authStore'
import { Camera, Loader2, ShieldCheck, ShieldAlert } from 'lucide-react'
import { toast } from 'sonner'

// The provider edits these; comma/newline-separated inputs map to string[].
const LIST_FIELDS = [
  { key: 'subSpecializations', label: 'Subspecialties', from: 'subspecialties' },
  { key: 'qualificationsList', label: 'Qualifications & Degrees', from: 'qualifications' },
  { key: 'certifications', label: 'Certifications', from: 'certifications' },
  { key: 'professionalMemberships', label: 'Professional Memberships', from: 'professionalMemberships' },
  { key: 'languages', label: 'Languages Spoken', from: 'languages' },
  { key: 'clinicalInterests', label: 'Areas of Clinical Interest', from: 'clinicalInterests' },
  { key: 'consultationServices', label: 'Consultation Services Offered', from: 'consultationServices' },
] as const

function toLines(arr?: string[] | null): string {
  return (arr ?? []).join('\n')
}
function fromLines(text: string): string[] {
  return text.split(/[\n,]/).map((s) => s.trim()).filter(Boolean)
}

export default function ProviderProfilePage() {
  const [profile, setProfile] = useState<ProviderProfile | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [uploadingPhoto, setUploadingPhoto] = useState(false)
  const fetchMe = useAuthStore((s) => s.fetchMe)

  // Editable form state
  const [bio, setBio] = useState('')
  const [years, setYears] = useState('')
  const [lists, setLists] = useState<Record<string, string>>({})
  const [clinicName, setClinicName] = useState('')
  const [clinicAddress, setClinicAddress] = useState('')
  const [clinicCity, setClinicCity] = useState('')
  const [clinicState, setClinicState] = useState('')
  const [acceptsVirtual, setAcceptsVirtual] = useState(true)

  const hydrate = useCallback((p: ProviderProfile) => {
    setProfile(p)
    setBio(p.bio ?? '')
    setYears(String(p.yearsExperience ?? 0))
    setClinicName(p.clinicName ?? '')
    setClinicAddress(p.clinicAddress ?? '')
    setClinicCity(p.clinicCity ?? '')
    setClinicState(p.clinicState ?? '')
    setAcceptsVirtual(p.isAvailable)
    const initial: Record<string, string> = {}
    for (const f of LIST_FIELDS) initial[f.key] = toLines(p[f.from] as string[])
    setLists(initial)
  }, [])

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await providerSelf.getProfile()
      hydrate(res.data)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not load your profile')
    } finally {
      setLoading(false)
    }
  }, [hydrate])

  useEffect(() => { load() }, [load])

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
      toast.error('Use a JPG, PNG or WebP image')
      return
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error('Image must be 5MB or smaller')
      return
    }
    setUploadingPhoto(true)
    try {
      const { uploadUrl, publicUrl } = await providerSelf.requestPhotoUploadUrl(file.type, file.size)
      const put = await fetch(uploadUrl, { method: 'PUT', headers: { 'Content-Type': file.type }, body: file })
      if (!put.ok) throw new Error('Upload to storage failed')
      await providerSelf.setProfilePhoto(publicUrl)
      await fetchMe()
      setProfile((prev) => (prev ? { ...prev, profilePhotoUrl: publicUrl } : prev))
      toast.success('Profile photo updated')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Photo upload failed')
    } finally {
      setUploadingPhoto(false)
    }
  }

  const handleSave = async () => {
    const yearsNum = Number(years)
    if (years.trim() && (isNaN(yearsNum) || yearsNum < 0 || yearsNum > 80 || !Number.isInteger(yearsNum))) {
      toast.error('Years of experience must be a whole number between 0 and 80')
      return
    }
    const dto: ProviderProfileUpdate = {
      bio: bio.trim(),
      yearsOfExperience: yearsNum || 0,
      clinicName: clinicName.trim(),
      clinicAddress: clinicAddress.trim(),
      clinicCity: clinicCity.trim(),
      clinicState: clinicState.trim(),
      acceptsVirtualConsults: acceptsVirtual,
    }
    for (const f of LIST_FIELDS) {
      ;(dto as Record<string, unknown>)[f.key] = fromLines(lists[f.key] ?? '')
    }
    setSaving(true)
    try {
      const res = await providerSelf.updateProfile(dto)
      hydrate(res.data)
      toast.success('Profile saved')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not save your profile')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="max-w-[900px] space-y-4">
        <SkeletonBox height={120} className="rounded-2xl" />
        <SkeletonBox height={300} className="rounded-2xl" />
      </div>
    )
  }

  if (!profile) {
    return <p className="text-sm" style={{ color: 'var(--color-text-muted)' }}>No provider profile found for your account.</p>
  }

  const displayName = `${profile.title} ${profile.firstName} ${profile.lastName}`.trim()

  return (
    <div className="max-w-[900px]">
      <div className="mb-5">
        <h1 className="text-lg font-bold" style={{ color: 'var(--color-text)' }}>My Profile</h1>
        <p className="text-sm mt-0.5" style={{ color: 'var(--color-text-muted)' }}>
          This information is shown to patients when they choose a provider.
        </p>
      </div>

      {/* Header: photo + identity + verification state */}
      <Card className="mb-4">
        <div className="flex items-center gap-4">
          <div className="relative">
            <Avatar name={`${profile.firstName} ${profile.lastName}`} src={profile.profilePhotoUrl ?? undefined} size="lg" />
            <label
              className="absolute -bottom-1 -right-1 w-8 h-8 rounded-full flex items-center justify-center cursor-pointer border-2"
              style={{ background: 'var(--color-surface)', borderColor: 'var(--color-border)' }}
              title="Change photo"
            >
              {uploadingPhoto ? <Loader2 className="w-4 h-4 animate-spin" /> : <Camera className="w-4 h-4" style={{ color: 'var(--color-text-muted)' }} />}
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp"
                className="hidden"
                disabled={uploadingPhoto}
                onChange={handlePhotoUpload}
              />
            </label>
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-base font-bold" style={{ color: 'var(--color-text)' }}>{displayName}</h2>
              {profile.verifiedAt ? (
                <Pill variant="success"><ShieldCheck className="w-3 h-3 inline mr-1" />Verified</Pill>
              ) : (
                <Pill variant="warning"><ShieldAlert className="w-3 h-3 inline mr-1" />Pending verification</Pill>
              )}
            </div>
            <p className="text-sm mt-0.5" style={{ color: 'var(--color-text-muted)' }}>{profile.specialty}</p>
            <p className="text-[11px] mt-1" style={{ color: 'var(--color-text-faint)' }}>
              JPG, PNG or WebP · max 5MB. Name, specialty and license are managed by an administrator.
            </p>
          </div>
        </div>
      </Card>

      {/* Professional details */}
      <Card className="mb-4">
        <h3 className="text-sm font-bold mb-4" style={{ color: 'var(--color-text)' }}>Professional Details</h3>
        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-1">
            <label className="text-[11px] font-semibold uppercase tracking-wider" style={{ color: 'var(--color-text-muted)' }}>
              Professional Biography
            </label>
            <textarea
              rows={5}
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              placeholder="Tell patients about your background, approach to care, and experience."
              className="px-3 py-2 rounded-xl text-sm border outline-none focus:border-[#6DC43F] focus:ring-2 focus:ring-[#6DC43F]/20"
              style={{ background: 'var(--color-surface)', borderColor: 'var(--color-border)', color: 'var(--color-text)' }}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <FormInput
              label="Years of Clinical Experience"
              type="number"
              min={0}
              max={80}
              value={years}
              onChange={(e) => setYears(e.target.value)}
            />
            <div className="flex items-end pb-2">
              <label className="flex items-center gap-2 cursor-pointer text-sm" style={{ color: 'var(--color-text)' }}>
                <input type="checkbox" checked={acceptsVirtual} onChange={(e) => setAcceptsVirtual(e.target.checked)} />
                Available for virtual consultations
              </label>
            </div>
          </div>

          {LIST_FIELDS.map((f) => (
            <div key={f.key} className="flex flex-col gap-1">
              <label className="text-[11px] font-semibold uppercase tracking-wider" style={{ color: 'var(--color-text-muted)' }}>
                {f.label}
              </label>
              <textarea
                rows={3}
                value={lists[f.key] ?? ''}
                onChange={(e) => setLists((prev) => ({ ...prev, [f.key]: e.target.value }))}
                placeholder="One per line (or comma-separated)"
                className="px-3 py-2 rounded-xl text-sm border outline-none focus:border-[#6DC43F] focus:ring-2 focus:ring-[#6DC43F]/20"
                style={{ background: 'var(--color-surface)', borderColor: 'var(--color-border)', color: 'var(--color-text)' }}
              />
            </div>
          ))}
        </div>
      </Card>

      {/* Clinic location */}
      <Card className="mb-4">
        <h3 className="text-sm font-bold mb-4" style={{ color: 'var(--color-text)' }}>Clinic Location</h3>
        <div className="grid grid-cols-2 gap-4">
          <FormInput label="Clinic / Practice Name" value={clinicName} onChange={(e) => setClinicName(e.target.value)} />
          <FormInput label="Address" value={clinicAddress} onChange={(e) => setClinicAddress(e.target.value)} />
          <FormInput label="City" value={clinicCity} onChange={(e) => setClinicCity(e.target.value)} />
          <FormInput label="State" value={clinicState} onChange={(e) => setClinicState(e.target.value)} />
        </div>
      </Card>

      <div className="flex justify-end gap-2">
        <Button variant="secondary" onClick={load} disabled={saving}>Reset</Button>
        <Button onClick={handleSave} disabled={saving}>
          {saving ? 'Saving…' : 'Save changes'}
        </Button>
      </div>
    </div>
  )
}
