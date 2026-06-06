'use client'

import { Card, CardTitle } from '@/components/ui/Card'
import { FormInput, FormSelect } from '@/components/ui/FormInput'
import { Button } from '@/components/ui/Button'
import { Pill } from '@/components/ui/Pill'
import { IdChip } from '@/components/ui/IdChip'
import { Avatar } from '@/components/ui/Avatar'
import { PATIENT } from '@/lib/data/patient'
import { toast } from 'sonner'
import { patients } from '@/lib/api'
import { useApi } from '@/lib/hooks/useApi'
import { ProfileSkeleton } from '@/components/skeletons/ProfileSkeleton'
import { ErrorState } from '@/components/ui/ErrorState'

export function ProfileScreen() {
  const { data: profileRes, isInitialLoad, error, refetch } = useApi(() => patients.getMyProfile())

  if (isInitialLoad) return <ProfileSkeleton />
  if (error && !profileRes) return <ErrorState message={error} onRetry={refetch} />
  const profile = profileRes?.data

  const displayName = profile ? `${profile.firstName} ${profile.lastName}` : PATIENT.name
  const hhaId = profile?.hhaId ?? PATIENT.id
  const status = profile?.status ?? PATIENT.status
  const dob = profile?.dateOfBirth?.slice(0, 10) ?? PATIENT.dob
  const gender = profile?.gender ?? PATIENT.gender
  const phone = profile?.user?.phone ?? PATIENT.phone
  const email = profile?.user?.email ?? PATIENT.email
  const address = profile?.address ?? PATIENT.address

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
        <Avatar
          seed={displayName}
          size="lg"
          shape="rounded"
          alt={`Avatar for ${displayName}`}
        />
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
          <FormSelect label="Blood Group" defaultValue={PATIENT.bloodGroup}>
            {['A+','A-','B+','B-','AB+','AB-','O+','O-'].map(bg => (
              <option key={bg}>{bg}</option>
            ))}
          </FormSelect>
          <FormInput label="Allergies" defaultValue={profile?.medicalInfo?.allergies?.join(', ') ?? PATIENT.medical.allergies} />
          <FormInput label="Chronic Conditions" defaultValue={profile?.medicalInfo?.chronicConditions?.join(', ') ?? PATIENT.medical.conditions.join(', ')} />
          <FormInput label="Current Medications" defaultValue={profile?.medicalInfo?.activeMedications?.join(', ') ?? PATIENT.medical.medications.join(', ')} />
          <FormInput label="Active Care Plan" defaultValue={profile?.medicalInfo?.activeCarePlan ?? PATIENT.medical.carePlan} readOnly />
        </div>
      </Card>

      {/* Emergency Contact */}
      <Card>
        <CardTitle>Emergency Contact</CardTitle>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <FormInput label="Full Name" defaultValue={profile?.emergencyContacts?.[0]?.fullName ?? PATIENT.emergency.name} />
          <FormInput label="Relationship" defaultValue={profile?.emergencyContacts?.[0]?.relationship ?? PATIENT.emergency.relation} />
          <FormInput label="Phone" type="tel" defaultValue={profile?.emergencyContacts?.[0]?.phone ?? PATIENT.emergency.phone} />
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
