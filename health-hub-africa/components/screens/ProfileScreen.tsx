'use client'

import { useState, useEffect } from 'react'
import { Card, CardTitle } from '@/components/ui/Card'
import { FormInput, FormSelect } from '@/components/ui/FormInput'
import { Button } from '@/components/ui/Button'
import { Pill } from '@/components/ui/Pill'
import { IdChip } from '@/components/ui/IdChip'
import { Avatar } from '@/components/ui/Avatar'
import { toast } from 'sonner'
import { patients, ApiError } from '@/lib/api'
import { useApi } from '@/lib/hooks/useApi'
import { ProfileSkeleton } from '@/components/skeletons/ProfileSkeleton'
import { ErrorState } from '@/components/ui/ErrorState'

// Prisma stores blood group as enum key (e.g. O_PLUS); display as symbol (O+)
const BLOOD_GROUP_TO_DISPLAY: Record<string, string> = {
  A_PLUS: 'A+', A_MINUS: 'A-', B_PLUS: 'B+', B_MINUS: 'B-',
  AB_PLUS: 'AB+', AB_MINUS: 'AB-', O_PLUS: 'O+', O_MINUS: 'O-',
}
const BLOOD_GROUP_TO_ENUM: Record<string, string> = Object.fromEntries(
  Object.entries(BLOOD_GROUP_TO_DISPLAY).map(([k, v]) => [v, k])
)

export function ProfileScreen() {
  const { data: profileRes, isInitialLoad, error, refetch } = useApi(() => patients.getMyProfile())
  const [isUploading, setIsUploading] = useState(false)
  const [isSaving, setIsSaving] = useState(false)

  // Controlled form state — populated from profile once loaded
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [dob, setDob] = useState('')
  const [gender, setGender] = useState('Female')
  const [address, setAddress] = useState('')
  const [bloodGroup, setBloodGroup] = useState('')
  const [allergiesText, setAllergiesText] = useState('')
  const [chronicText, setChronicText] = useState('')
  const [nin, setNin] = useState('')

  const profile = profileRes?.data

  useEffect(() => {
    if (!profile) return
    setFirstName(profile.firstName ?? '')
    setLastName(profile.lastName ?? '')
    setDob(profile.dateOfBirth?.slice(0, 10) ?? '')
    // Prisma Gender enum uses underscores for multi-word values
    setGender(profile.gender === 'Prefer_not_to_say' ? 'Prefer not to say' : (profile.gender ?? 'Female'))
    setAddress(profile.address ?? '')
    setBloodGroup(BLOOD_GROUP_TO_DISPLAY[profile.bloodGroup ?? ''] ?? profile.bloodGroup ?? '')
    setAllergiesText(profile.medicalInfo?.allergies?.join(', ') ?? '')
    setChronicText(profile.medicalInfo?.chronicConditions?.join(', ') ?? '')
    setNin(profile.nin ?? '')
  }, [profileRes])

  if (isInitialLoad) return <ProfileSkeleton />
  if (error && !profileRes) return <ErrorState message={error} onRetry={refetch} />

  const displayName = profile ? `${profile.firstName} ${profile.lastName}` : ''
  const hhaId = profile?.hhaPatientId ?? ''
  const status = profile?.status ?? 'Active'
  const email = profile?.user?.email ?? ''
  const phone = profile?.user?.phone ?? ''

  async function handlePhotoUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return

    const allowedTypes = ['image/png', 'image/jpeg', 'image/webp']
    if (!allowedTypes.includes(file.type)) {
      toast.error('Invalid file type', { description: 'Only PNG, JPEG, and WebP images are allowed.' })
      return
    }

    if (file.size > 5 * 1024 * 1024) {
      toast.error('File too large', { description: 'Profile photo must be smaller than 5 MB.' })
      return
    }

    setIsUploading(true)
    const toastId = toast.loading('Uploading profile picture...')

    try {
      const { uploadUrl, publicUrl } = await patients.getProfilePhotoUploadUrl({
        contentType: file.type,
        sizeBytes: file.size,
      })

      const uploadRes = await fetch(uploadUrl, {
        method: 'PUT',
        headers: { 'Content-Type': file.type },
        body: file,
      })

      if (!uploadRes.ok) throw new Error('S3 upload failed')

      if (!profile?.id) throw new Error('No active profile to update')

      await patients.update(profile.id, { profilePhotoUrl: publicUrl })
      toast.success('Profile photo updated', { id: toastId, description: 'Your changes have been saved.' })
      refetch()
    } catch (err: unknown) {
      toast.error('Upload failed', {
        id: toastId,
        description: err instanceof Error ? err.message : 'An error occurred during file upload.',
      })
    } finally {
      setIsUploading(false)
    }
  }

  async function handleSave() {
    if (!profile?.id) {
      toast.error('Cannot save', { description: 'No active profile found.' })
      return
    }

    setIsSaving(true)
    try {
      const allergies = allergiesText.split(',').map(s => s.trim()).filter(Boolean)
      const chronicConditions = chronicText.split(',').map(s => s.trim()).filter(Boolean)
      const bloodGroupEnum = BLOOD_GROUP_TO_ENUM[bloodGroup] ?? bloodGroup
      const genderEnum = gender === 'Prefer not to say' ? 'Prefer_not_to_say' : gender

      await patients.update(profile.id, {
        firstName: firstName.trim() || undefined,
        lastName: lastName.trim() || undefined,
        dateOfBirth: dob || undefined,
        gender: genderEnum || undefined,
        bloodGroup: bloodGroupEnum || undefined,
        address: address.trim() || undefined,
        allergies,
        chronicConditions,
        ...(nin.trim() ? { nin: nin.trim() } : {}),
      })

      toast.success('Profile saved', { description: 'Your health profile has been updated.' })
      refetch()
    } catch (err: unknown) {
      const description = err instanceof ApiError || err instanceof Error
        ? err.message
        : 'An error occurred. Please try again.'
      toast.error('Save failed', { description })
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <div className="flex flex-col gap-5 pb-20 md:pb-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold" style={{ color: 'var(--color-text)', fontFamily: 'var(--font-display)' }}>
            Patient Profile
          </h1>
          <div className="flex items-center gap-2 mt-1">
            <IdChip>{hhaId}</IdChip>
            <Pill variant="success">{status}</Pill>
          </div>
        </div>
        <div className="relative group overflow-hidden rounded-2xl border border-[var(--color-border)] hover:border-emerald-500 transition-all duration-300 shadow-md">
          <Avatar
            seed={displayName}
            src={profile?.profilePhotoUrl}
            size="lg"
            shape="rounded"
            alt={`Avatar for ${displayName}`}
            className="group-hover:scale-105 transition-transform duration-300"
          />
          <label className="absolute inset-0 flex flex-col items-center justify-center bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity duration-300 cursor-pointer text-white text-[10px] font-semibold select-none gap-1">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-5 h-5 animate-pulse">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6.827 6.175A2.31 2.31 0 0 1 5.186 7.23c-.38.054-.757.112-1.134.175C2.999 7.58 2.25 8.507 2.25 9.574V18a2.25 2.25 0 0 0 2.25 2.25h15A2.25 2.25 0 0 0 21.75 18V9.574c0-1.067-.75-1.994-1.802-2.169a47.865 47.865 0 0 0-1.134-.175 2.31 2.31 0 0 1-1.64-1.055l-.822-1.316a2.192 2.192 0 0 0-1.736-1.039 48.774 48.774 0 0 0-5.232 0 2.192 2.192 0 0 0-1.736 1.039l-.821 1.316Z" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 12.75a4.5 4.5 0 1 1-9 0 4.5 4.5 0 0 1 9 0ZM18.75 10.5h.008v.008h-.008V10.5Z" />
            </svg>
            <span>{isUploading ? 'Uploading...' : 'Change Photo'}</span>
            <input
              type="file"
              accept="image/png, image/jpeg, image/webp"
              onChange={handlePhotoUpload}
              className="hidden"
              disabled={isUploading}
            />
          </label>
        </div>
      </div>

      {/* Personal Info */}
      <Card>
        <CardTitle>Personal Information</CardTitle>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <FormInput label="First Name" value={firstName} onChange={e => setFirstName(e.target.value)} />
          <FormInput label="Last Name" value={lastName} onChange={e => setLastName(e.target.value)} />
          <FormInput label="Date of Birth" type="date" value={dob} onChange={e => setDob(e.target.value)} />
          <FormSelect label="Gender" value={gender} onChange={e => setGender(e.target.value)}>
            <option>Male</option>
            <option>Female</option>
            <option>Other</option>
            <option>Prefer not to say</option>
          </FormSelect>
          <FormInput label="Phone" type="tel" value={phone} readOnly />
          <FormInput label="Email" type="email" value={email} readOnly />
          <FormInput label="Address" value={address} onChange={e => setAddress(e.target.value)} />
          <FormInput
            label="National Healthcare ID / Insurance No."
            value={nin}
            onChange={e => setNin(e.target.value)}
            placeholder="e.g. NHIF-94827-X"
          />
        </div>
      </Card>

      {/* Medical Info */}
      <Card>
        <CardTitle>Medical Information</CardTitle>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <FormSelect label="Blood Group" value={bloodGroup} onChange={e => setBloodGroup(e.target.value)}>
            <option value="">Not set</option>
            {['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'].map(bg => (
              <option key={bg}>{bg}</option>
            ))}
          </FormSelect>
          <FormInput
            label="Allergies"
            value={allergiesText}
            onChange={e => setAllergiesText(e.target.value)}
            placeholder="Comma-separated, e.g. Penicillin, Peanuts"
          />
          <FormInput
            label="Chronic Conditions"
            value={chronicText}
            onChange={e => setChronicText(e.target.value)}
            placeholder="Comma-separated, e.g. Hypertension, Asthma"
          />
          <FormInput
            label="Current Medications"
            defaultValue={profile?.medicalInfo?.activeMedications?.join(', ') ?? ''}
            placeholder="None recorded"
            readOnly
          />
          <FormInput
            label="Active Care Plan"
            defaultValue={profile?.medicalInfo?.activeCarePlan ?? ''}
            placeholder="No active care plan"
            readOnly
          />
        </div>
      </Card>

      {/* Emergency Contact — display only; updates require a separate flow */}
      <Card>
        <CardTitle>Emergency Contact</CardTitle>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <FormInput label="Full Name" defaultValue={profile?.emergencyContacts?.[0]?.fullName ?? ''} placeholder="Not set" readOnly />
          <FormInput label="Relationship" defaultValue={profile?.emergencyContacts?.[0]?.relationship ?? ''} placeholder="Not set" readOnly />
          <FormInput label="Phone" type="tel" defaultValue={profile?.emergencyContacts?.[0]?.phone ?? ''} placeholder="Not set" readOnly />
        </div>
      </Card>

      <div className="flex gap-3">
        <Button onClick={handleSave} disabled={isSaving} className="min-w-[120px]">
          {isSaving ? 'Saving…' : 'Save Changes'}
        </Button>
        <Button variant="secondary" disabled={isSaving} onClick={() => refetch()}>
          Cancel
        </Button>
      </div>
    </div>
  )
}
