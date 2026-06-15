'use client'

import { useState } from 'react'
import { Card, CardTitle } from '@/components/ui/Card'
import { FormInput, FormSelect } from '@/components/ui/FormInput'
import { Button } from '@/components/ui/Button'
import { Pill } from '@/components/ui/Pill'
import { IdChip } from '@/components/ui/IdChip'
import { Avatar } from '@/components/ui/Avatar'
import { toast } from 'sonner'
import { patients } from '@/lib/api'
import { useApi } from '@/lib/hooks/useApi'
import { ProfileSkeleton } from '@/components/skeletons/ProfileSkeleton'
import { ErrorState } from '@/components/ui/ErrorState'

export function ProfileScreen() {
  const { data: profileRes, isInitialLoad, error, refetch } = useApi(() => patients.getMyProfile())
  const [isUploading, setIsUploading] = useState(false)

  if (isInitialLoad) return <ProfileSkeleton />
  if (error && !profileRes) return <ErrorState message={error} onRetry={refetch} />
  const profile = profileRes?.data

  const displayName = profile ? `${profile.firstName} ${profile.lastName}` : ''
  const hhaId = profile?.hhaId ?? ''
  const status = profile?.status ?? 'Active'
  const dob = profile?.dateOfBirth?.slice(0, 10) ?? ''
  const gender = profile?.gender ?? ''
  const phone = profile?.user?.phone ?? ''
  const email = profile?.user?.email ?? ''
  const address = profile?.address ?? ''

  async function handlePhotoUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return

    const allowedTypes = ['image/png', 'image/jpeg', 'image/webp']
    if (!allowedTypes.includes(file.type)) {
      toast.error('Invalid file type', {
        description: 'Only PNG, JPEG, and WebP images are allowed.',
      })
      return
    }

    const maxSize = 5 * 1024 * 1024 // 5MB
    if (file.size > maxSize) {
      toast.error('File too large', {
        description: 'Profile photo must be smaller than 5 MB.',
      })
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
        headers: {
          'Content-Type': file.type,
        },
        body: file,
      })

      if (!uploadRes.ok) {
        throw new Error('S3 upload failed')
      }

      if (profile?.id) {
        await patients.update(profile.id, { profilePhotoUrl: publicUrl })
        toast.success('Profile photo updated', {
          id: toastId,
          description: 'Your changes have been saved.',
        })
        refetch()
      } else {
        throw new Error('No active profile to update')
      }
    } catch (err: any) {
      console.error(err)
      toast.error('Upload failed', {
        id: toastId,
        description: err.message || 'An error occurred during file upload.',
      })
    } finally {
      setIsUploading(false)
    }
  }

  async function handleSave() {
    toast.success('Profile saved successfully', {
      description: 'Your health profile has been updated.',
    })
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
          <FormInput label="Full Name" defaultValue={displayName} />
          <FormInput label="Date of Birth" type="date" defaultValue={dob} />
          <FormSelect label="Gender" defaultValue={gender}>
            <option>Male</option>
            <option>Female</option>
            <option>Prefer not to say</option>
          </FormSelect>
          <FormInput label="Phone" type="tel" defaultValue={phone} />
          <FormInput label="Email" type="email" defaultValue={email} />
          <FormInput label="Address" defaultValue={address} />
        </div>
      </Card>

      {/* Medical Info */}
      <Card>
        <CardTitle>Medical Information</CardTitle>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <FormSelect label="Blood Group" defaultValue={profile?.bloodGroup ?? ''}>
            <option value="">Not set</option>
            {['A+','A-','B+','B-','AB+','AB-','O+','O-'].map(bg => (
              <option key={bg}>{bg}</option>
            ))}
          </FormSelect>
          <FormInput label="Allergies" defaultValue={profile?.medicalInfo?.allergies?.join(', ') ?? ''} placeholder="None recorded" />
          <FormInput label="Chronic Conditions" defaultValue={profile?.medicalInfo?.chronicConditions?.join(', ') ?? ''} placeholder="None recorded" />
          <FormInput label="Current Medications" defaultValue={profile?.medicalInfo?.activeMedications?.join(', ') ?? ''} placeholder="None recorded" />
          <FormInput label="Active Care Plan" defaultValue={profile?.medicalInfo?.activeCarePlan ?? ''} placeholder="No active care plan" readOnly />
        </div>
      </Card>

      {/* Emergency Contact */}
      <Card>
        <CardTitle>Emergency Contact</CardTitle>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <FormInput label="Full Name" defaultValue={profile?.emergencyContacts?.[0]?.fullName ?? ''} placeholder="Not set" />
          <FormInput label="Relationship" defaultValue={profile?.emergencyContacts?.[0]?.relationship ?? ''} placeholder="Not set" />
          <FormInput label="Phone" type="tel" defaultValue={profile?.emergencyContacts?.[0]?.phone ?? ''} placeholder="Not set" />
        </div>
      </Card>

      <div className="flex gap-3">
        <Button onClick={handleSave} className="min-w-[120px]">
          Save Changes
        </Button>
        <Button variant="secondary">Cancel</Button>
      </div>
    </div>
  )
}
