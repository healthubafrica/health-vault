'use client'

import { useState, useEffect } from 'react'
import { Card, CardTitle } from '@/components/ui/Card'
import { FormInput, FormSelect, FormTextarea } from '@/components/ui/FormInput'
import { Button } from '@/components/ui/Button'
import { Pill } from '@/components/ui/Pill'
import { IdChip } from '@/components/ui/IdChip'
import { Avatar } from '@/components/ui/Avatar'
import { Camera } from 'lucide-react'
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
const DISABILITY_OPTIONS = ['None', 'Physical', 'Visual', 'Hearing', 'Cognitive', 'Multiple', 'Other']

function listToText(value?: string[]) {
  return value?.join(', ') ?? ''
}

function textToList(value: string) {
  return value.split(',').map(s => s.trim()).filter(Boolean)
}

function nullableNumber(value: string) {
  const trimmed = value.trim()
  if (!trimmed) return null
  const parsed = Number(trimmed)
  return Number.isFinite(parsed) ? parsed : undefined
}

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
  const [genotype, setGenotype] = useState('')
  const [heightCm, setHeightCm] = useState('')
  const [weightKg, setWeightKg] = useState('')
  const [disabilityStatus, setDisabilityStatus] = useState('None')
  const [disabilityDetails, setDisabilityDetails] = useState('')
  const [allergiesText, setAllergiesText] = useState('')
  const [chronicText, setChronicText] = useState('')
  const [medicationsText, setMedicationsText] = useState('')
  const [carePlanText, setCarePlanText] = useState('')
  const [medicalNotes, setMedicalNotes] = useState('')
  const [nextOfKinName, setNextOfKinName] = useState('')
  const [nextOfKinRelationship, setNextOfKinRelationship] = useState('')
  const [nextOfKinPhone, setNextOfKinPhone] = useState('')
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
    setGenotype(profile.genotype ?? '')
    setHeightCm(profile.medicalInfo?.heightCm != null ? String(profile.medicalInfo.heightCm) : '')
    setWeightKg(profile.medicalInfo?.weightKg != null ? String(profile.medicalInfo.weightKg) : '')
    setDisabilityStatus(profile.medicalInfo?.disabilityStatus ?? 'None')
    setDisabilityDetails(profile.medicalInfo?.disabilityDetails ?? '')
    setAllergiesText(listToText(profile.medicalInfo?.allergies))
    setChronicText(listToText(profile.medicalInfo?.chronicConditions))
    setMedicationsText(listToText(profile.medicalInfo?.activeMedications))
    setCarePlanText(profile.medicalInfo?.activeCarePlan ?? '')
    setMedicalNotes(profile.medicalInfo?.notes ?? '')
    setNextOfKinName(profile.nextOfKinName ?? profile.emergencyContacts?.[0]?.fullName ?? '')
    setNextOfKinRelationship(profile.nextOfKinRelationship ?? profile.emergencyContacts?.[0]?.relationship ?? '')
    setNextOfKinPhone(profile.nextOfKinPhone ?? profile.emergencyContacts?.[0]?.phone ?? '')
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
      toast.error("That image type isn't supported", { description: 'Kindly upload a PNG, JPEG, or WebP photo.' })
      return
    }

    if (file.size > 5 * 1024 * 1024) {
      toast.error('That photo is too large', { description: 'Kindly upload a photo smaller than 5 MB.' })
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
      const bloodGroupEnum = BLOOD_GROUP_TO_ENUM[bloodGroup] ?? bloodGroup
      const genderEnum = gender === 'Prefer not to say' ? 'Prefer_not_to_say' : gender

      await patients.update(profile.id, {
        firstName: firstName.trim() || undefined,
        lastName: lastName.trim() || undefined,
        dateOfBirth: dob || undefined,
        gender: genderEnum || undefined,
        bloodGroup: bloodGroupEnum || undefined,
        genotype: genotype.trim() || null,
        address: address.trim() || undefined,
        nextOfKinName: nextOfKinName.trim() || null,
        nextOfKinRelationship: nextOfKinRelationship.trim() || null,
        nextOfKinPhone: nextOfKinPhone.trim() || null,
        medicalInfo: {
          allergies: textToList(allergiesText),
          chronicConditions: textToList(chronicText),
          activeMedications: textToList(medicationsText),
          heightCm: nullableNumber(heightCm),
          weightKg: nullableNumber(weightKg),
          disabilityStatus: disabilityStatus || undefined,
          disabilityDetails: disabilityDetails.trim() || null,
          activeCarePlan: carePlanText.trim() || null,
          notes: medicalNotes.trim() || null,
        },
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
        <div className="flex flex-col items-center gap-2">
          <div className="relative group overflow-hidden rounded-2xl border border-[var(--color-border)] hover:border-emerald-500 transition-all duration-300 shadow-md">
            <Avatar
              seed={displayName}
              src={profile?.profilePhotoUrl}
              size="lg"
              shape="rounded"
              alt={`Avatar for ${displayName}`}
              className="group-hover:scale-105 transition-transform duration-300"
            />
            {/* Desktop hover shortcut — the visible button below is the
                primary affordance (hover doesn't exist on touch devices). */}
            <label
              htmlFor="profile-photo-input"
              className="absolute inset-0 hidden md:flex flex-col items-center justify-center bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity duration-300 cursor-pointer text-white text-[10px] font-semibold select-none gap-1"
            >
              <Camera size={18} />
              <span>{isUploading ? 'Uploading...' : 'Change Photo'}</span>
            </label>
          </div>
          <label
            htmlFor="profile-photo-input"
            className="inline-flex items-center gap-1.5 text-[11px] font-semibold px-3 py-1.5 rounded-full border cursor-pointer transition-colors hover:border-emerald-500"
            style={{ borderColor: 'var(--color-border)', color: 'var(--color-text)', background: 'var(--color-surface)' }}
          >
            <Camera size={12} />
            {isUploading ? 'Uploading…' : 'Change Photo'}
          </label>
          <input
            id="profile-photo-input"
            type="file"
            accept="image/png, image/jpeg, image/webp"
            onChange={handlePhotoUpload}
            className="hidden"
            disabled={isUploading}
          />
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
          <FormSelect label="Genotype" value={genotype} onChange={e => setGenotype(e.target.value)}>
            <option value="">Not set</option>
            {['AA', 'AS', 'SS', 'AC', 'SC', 'CC', 'Other'].map(value => (
              <option key={value}>{value}</option>
            ))}
          </FormSelect>
          <FormInput
            label="Height (cm)"
            type="number"
            min="30"
            max="260"
            step="0.1"
            value={heightCm}
            onChange={e => setHeightCm(e.target.value)}
            placeholder="e.g. 172"
          />
          <FormInput
            label="Weight (kg)"
            type="number"
            min="1"
            max="500"
            step="0.1"
            value={weightKg}
            onChange={e => setWeightKg(e.target.value)}
            placeholder="e.g. 70.5"
          />
          <FormSelect label="Disability Status" value={disabilityStatus} onChange={e => setDisabilityStatus(e.target.value)}>
            {DISABILITY_OPTIONS.map(value => (
              <option key={value}>{value}</option>
            ))}
          </FormSelect>
          <FormInput
            label="Disability Details"
            value={disabilityDetails}
            onChange={e => setDisabilityDetails(e.target.value)}
            placeholder="Mobility aid, sensory needs, or accommodations"
          />
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
            value={medicationsText}
            onChange={e => setMedicationsText(e.target.value)}
            placeholder="Comma-separated, e.g. Metformin, Amlodipine"
          />
          <FormTextarea
            label="Active Care Plan"
            value={carePlanText}
            onChange={e => setCarePlanText(e.target.value)}
            placeholder="Care instructions, monitoring plan, or provider guidance"
            rows={3}
            className="min-h-24 sm:col-span-2"
          />
          <FormTextarea
            label="Clinical Notes"
            value={medicalNotes}
            onChange={e => setMedicalNotes(e.target.value)}
            placeholder="Implants, past surgeries, pregnancy status, assistive devices, or other emergency-relevant context"
            rows={3}
            className="min-h-24 sm:col-span-2"
          />
        </div>
      </Card>

      {/* Emergency Contact */}
      <Card>
        <CardTitle>Emergency & Next of Kin</CardTitle>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <FormInput label="Full Name" value={nextOfKinName} onChange={e => setNextOfKinName(e.target.value)} placeholder="Not set" />
          <FormInput label="Relationship" value={nextOfKinRelationship} onChange={e => setNextOfKinRelationship(e.target.value)} placeholder="Not set" />
          <FormInput label="Phone" type="tel" value={nextOfKinPhone} onChange={e => setNextOfKinPhone(e.target.value)} placeholder="Not set" />
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
