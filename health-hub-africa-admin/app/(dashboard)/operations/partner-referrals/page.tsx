'use client'

import { useEffect, useState, useCallback } from 'react'
import { adminApi } from '@/lib/api'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { FormInput, FormSelect } from '@/components/ui/FormInput'
import { SkeletonBox } from '@/components/ui/Skeleton'
import { RefreshCw, Plus, X } from 'lucide-react'

interface Partner {
  id: number
  code: string
  name: string
  active: boolean
}

interface ReferralCode {
  id: number
  code: string
  partnerId: number
  partnerName: string
  providerId: number | null
  campaignName: string | null
  description: string | null
  active: boolean
  expiresAt: string | null
  maxUses: number | null
  usesCount: number
  createdAt: string
}

export default function PartnerReferralsPage() {
  const [partners, setPartners] = useState<Partner[]>([])
  const [codes, setCodes] = useState<ReferralCode[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showCreate, setShowCreate] = useState(false)
  const [toggling, setToggling] = useState<number | null>(null)

  // Create form state
  const [newCode, setNewCode] = useState('')
  const [newPartnerId, setNewPartnerId] = useState('')
  const [newCampaign, setNewCampaign] = useState('')
  const [newDescription, setNewDescription] = useState('')
  const [newMaxUses, setNewMaxUses] = useState('')
  const [newExpiresAt, setNewExpiresAt] = useState('')
  const [creating, setCreating] = useState(false)
  const [createError, setCreateError] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const [partnersRes, codesRes] = await Promise.all([
        adminApi.openemr.listReferralPartners(),
        adminApi.openemr.listReferralCodes(),
      ])
      setPartners(partnersRes)
      setCodes(codesRes)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load partner referral data')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  async function handleCreate() {
    setCreateError(null)
    if (!newCode.trim() || !newPartnerId) {
      setCreateError('Code and partner are required.')
      return
    }
    setCreating(true)
    try {
      await adminApi.openemr.createReferralCode({
        code: newCode.trim(),
        partnerId: Number(newPartnerId),
        campaignName: newCampaign.trim() || undefined,
        description: newDescription.trim() || undefined,
        maxUses: newMaxUses.trim() ? Number(newMaxUses) : null,
        expiresAt: newExpiresAt || null,
      })
      setNewCode('')
      setNewPartnerId('')
      setNewCampaign('')
      setNewDescription('')
      setNewMaxUses('')
      setNewExpiresAt('')
      setShowCreate(false)
      await load()
    } catch (err) {
      setCreateError(err instanceof Error ? err.message : 'Failed to create referral code')
    } finally {
      setCreating(false)
    }
  }

  async function handleToggleActive(code: ReferralCode) {
    setToggling(code.id)
    setCodes((prev) => prev.map((c) => (c.id === code.id ? { ...c, active: !c.active } : c)))
    try {
      await adminApi.openemr.updateReferralCode(code.id, { active: !code.active })
    } catch (err) {
      setCodes((prev) => prev.map((c) => (c.id === code.id ? { ...c, active: code.active } : c)))
      setError(err instanceof Error ? err.message : 'Failed to update referral code')
    } finally {
      setToggling(null)
    }
  }

  return (
    <div className="max-w-[1200px]">
      <div className="flex items-center justify-between mb-5">
        <div>
          <h1 className="text-lg font-bold" style={{ color: 'var(--color-text)' }}>
            Partner Referrals
          </h1>
          <p className="text-sm mt-0.5" style={{ color: 'var(--color-text-muted)' }}>
            Referral codes route new patient registrations to partner organizations. {codes.length} code{codes.length === 1 ? '' : 's'}.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="secondary" size="sm" onClick={load}>
            <RefreshCw className="w-3.5 h-3.5" />
            Refresh
          </Button>
          <Button variant="primary" size="sm" onClick={() => setShowCreate((s) => !s)}>
            {showCreate ? <X className="w-3.5 h-3.5" /> : <Plus className="w-3.5 h-3.5" />}
            {showCreate ? 'Cancel' : 'New Referral Code'}
          </Button>
        </div>
      </div>

      {error && (
        <div
          className="mb-4 px-4 py-3 rounded-xl text-sm"
          style={{ background: 'var(--color-error-bg)', color: 'var(--color-emergency)' }}
        >
          {error}
        </div>
      )}

      {showCreate && (
        <Card className="mb-5">
          <h2 className="text-sm font-bold mb-4" style={{ color: 'var(--color-text)' }}>
            New Referral Code
          </h2>
          {createError && (
            <div
              className="mb-3 px-3 py-2 rounded-lg text-xs"
              style={{ background: 'var(--color-error-bg)', color: 'var(--color-emergency)' }}
            >
              {createError}
            </div>
          )}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <FormInput
              label="Referral Code"
              placeholder="e.g. CRQ-REFERRAL"
              value={newCode}
              onChange={(e) => setNewCode(e.target.value.toUpperCase())}
              required
            />
            <FormSelect
              label="Partner Organization"
              value={newPartnerId}
              onChange={(e) => setNewPartnerId(e.target.value)}
              required
            >
              <option value="">Select a partner…</option>
              {partners.filter((p) => p.active).map((p) => (
                <option key={p.id} value={p.id}>{p.name} ({p.code})</option>
              ))}
            </FormSelect>
            <FormInput
              label="Campaign Name"
              placeholder="Optional — e.g. Q3 Outreach"
              value={newCampaign}
              onChange={(e) => setNewCampaign(e.target.value)}
            />
            <FormInput
              label="Description"
              placeholder="Optional — internal note"
              value={newDescription}
              onChange={(e) => setNewDescription(e.target.value)}
            />
            <FormInput
              label="Max Uses"
              type="number"
              placeholder="Optional — unlimited if blank"
              value={newMaxUses}
              onChange={(e) => setNewMaxUses(e.target.value)}
            />
            <FormInput
              label="Expires At"
              type="date"
              value={newExpiresAt}
              onChange={(e) => setNewExpiresAt(e.target.value)}
            />
          </div>
          <Button variant="primary" size="sm" onClick={handleCreate} disabled={creating}>
            {creating ? 'Creating…' : 'Create Referral Code'}
          </Button>
        </Card>
      )}

      <div className="flex flex-col gap-3">
        {loading ? (
          Array.from({ length: 3 }).map((_, i) => (
            <Card key={i}>
              <div className="flex items-center justify-between gap-4">
                <div className="flex-1 flex flex-col gap-2">
                  <SkeletonBox height={16} className="rounded" style={{ width: 200 }} />
                  <SkeletonBox height={12} className="rounded" style={{ width: 320 }} />
                </div>
                <SkeletonBox height={20} className="rounded-full" style={{ width: 40 }} />
              </div>
            </Card>
          ))
        ) : codes.length === 0 ? (
          <Card>
            <p className="text-center text-sm py-4" style={{ color: 'var(--color-text-muted)' }}>
              No referral codes yet. Create one to start routing referred patients to a partner.
            </p>
          </Card>
        ) : (
          codes.map((code) => (
            <Card key={code.id}>
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    <p className="font-semibold text-sm font-mono" style={{ color: 'var(--color-text)' }}>
                      {code.code}
                    </p>
                    <span
                      className="text-[10px] font-semibold px-1.5 py-0.5 rounded"
                      style={{ background: 'var(--color-primary-light)', color: 'var(--color-primary)' }}
                    >
                      {code.partnerName}
                    </span>
                    {code.providerId && (
                      <span
                        className="text-[10px] font-mono px-1.5 py-0.5 rounded"
                        style={{ background: 'var(--color-bg)', color: 'var(--color-text-muted)' }}
                      >
                        provider #{code.providerId}
                      </span>
                    )}
                  </div>
                  {(code.campaignName || code.description) && (
                    <p className="text-xs mb-1" style={{ color: 'var(--color-text-muted)' }}>
                      {code.campaignName}{code.campaignName && code.description ? ' — ' : ''}{code.description}
                    </p>
                  )}
                  <p className="text-[11px]" style={{ color: 'var(--color-text-faint)' }}>
                    {code.usesCount} use{code.usesCount === 1 ? '' : 's'}
                    {code.maxUses !== null ? ` / ${code.maxUses} max` : ' (unlimited)'}
                    {code.expiresAt ? ` · expires ${new Date(code.expiresAt).toLocaleDateString()}` : ' · no expiry'}
                  </p>
                </div>

                <div className="flex items-center gap-3 flex-shrink-0">
                  <span
                    className="text-xs font-semibold"
                    style={{ color: code.active ? '#6DC43F' : 'var(--color-text-muted)' }}
                  >
                    {code.active ? 'ACTIVE' : 'INACTIVE'}
                  </span>

                  {toggling === code.id ? (
                    <span className="w-5 h-5 border-2 border-[#6DC43F] border-t-transparent rounded-full animate-spin flex-shrink-0" />
                  ) : (
                    <button
                      onClick={() => handleToggleActive(code)}
                      className="relative w-10 h-5 rounded-full transition-colors duration-200 focus:outline-none flex-shrink-0"
                      style={{ background: code.active ? '#6DC43F' : 'var(--color-border)' }}
                      aria-label={code.active ? `Deactivate ${code.code}` : `Activate ${code.code}`}
                      aria-checked={code.active}
                      role="switch"
                    >
                      <span
                        className="absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform duration-200"
                        style={{ transform: code.active ? 'translateX(20px)' : 'translateX(0)' }}
                      />
                    </button>
                  )}
                </div>
              </div>
            </Card>
          ))
        )}
      </div>
    </div>
  )
}
