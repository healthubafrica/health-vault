'use client'

import { Card, CardTitle } from '@/components/ui/Card'
import { FormInput, FormSelect } from '@/components/ui/FormInput'
import { Button } from '@/components/ui/Button'
import { Pill } from '@/components/ui/Pill'
import { IdChip } from '@/components/ui/IdChip'
import { Avatar } from '@/components/ui/Avatar'
import { PATIENT } from '@/lib/data/patient'
import { toast } from 'sonner'

export function ProfileScreen() {
  function handleSave() {
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
            <IdChip>{PATIENT.id}</IdChip>
            <Pill variant="success">{PATIENT.status}</Pill>
          </div>
        </div>
        <Avatar
          seed={PATIENT.name}
          size="lg"
          shape="rounded"
          alt={`Avatar for ${PATIENT.name}`}
        />
      </div>

      {/* Personal Info */}
      <Card>
        <CardTitle>Personal Information</CardTitle>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <FormInput label="Full Name" defaultValue={PATIENT.name} />
          <FormInput label="Date of Birth" type="date" defaultValue={PATIENT.dob} />
          <FormSelect label="Gender" defaultValue={PATIENT.gender}>
            <option>Male</option>
            <option>Female</option>
            <option>Prefer not to say</option>
          </FormSelect>
          <FormInput label="Phone" type="tel" defaultValue={PATIENT.phone} />
          <FormInput label="Email" type="email" defaultValue={PATIENT.email} />
          <FormInput label="Address" defaultValue={PATIENT.address} />
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
          <FormInput label="Allergies" defaultValue={PATIENT.medical.allergies} />
          <FormInput label="Chronic Conditions" defaultValue={PATIENT.medical.conditions.join(', ')} />
          <FormInput label="Current Medications" defaultValue={PATIENT.medical.medications.join(', ')} />
          <FormInput label="Active Care Plan" defaultValue={PATIENT.medical.carePlan} readOnly />
        </div>
      </Card>

      {/* Emergency Contact */}
      <Card>
        <CardTitle>Emergency Contact</CardTitle>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <FormInput label="Full Name" defaultValue={PATIENT.emergency.name} />
          <FormInput label="Relationship" defaultValue={PATIENT.emergency.relation} />
          <FormInput label="Phone" type="tel" defaultValue={PATIENT.emergency.phone} />
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
