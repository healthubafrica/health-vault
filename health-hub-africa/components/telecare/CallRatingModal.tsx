'use client'

import { useState } from 'react'
import { Star } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { FormTextarea } from '@/components/ui/FormInput'
import { telecare } from '@/lib/api'
import { toast } from 'sonner'

interface CallRatingModalProps {
  sessionId: string
  onDone: () => void
}

/** Prompted right after a call that actually connected ends — not shown for
 * an aborted/never-connected attempt, since there's nothing to rate. */
export function CallRatingModal({ sessionId, onDone }: CallRatingModalProps) {
  const [rating, setRating] = useState(0)
  const [hoverRating, setHoverRating] = useState(0)
  const [feedback, setFeedback] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const handleSubmit = async () => {
    if (rating === 0) return
    setSubmitting(true)
    try {
      await telecare.rate(sessionId, rating, feedback.trim() || undefined)
      toast.success('Thanks for the feedback')
    } catch {
      // Non-critical — don't block the patient from moving on over a rating failure.
    } finally {
      setSubmitting(false)
      onDone()
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0" style={{ background: 'rgba(0,0,0,0.6)' }} />
      <Card className="relative w-full max-w-sm rounded-2xl shadow-2xl">
        <div className="flex flex-col gap-4 items-center text-center py-2">
          <h2 className="text-base font-bold" style={{ color: 'var(--color-text)', fontFamily: 'var(--font-display)' }}>
            How was your consultation?
          </h2>
          <div className="flex items-center gap-1.5" role="radiogroup" aria-label="Rate your consultation">
            {[1, 2, 3, 4, 5].map((n) => (
              <button
                key={n}
                type="button"
                role="radio"
                aria-checked={rating === n}
                aria-label={`${n} star${n === 1 ? '' : 's'}`}
                onClick={() => setRating(n)}
                onMouseEnter={() => setHoverRating(n)}
                onMouseLeave={() => setHoverRating(0)}
                className="p-1"
              >
                <Star
                  size={30}
                  className={n <= (hoverRating || rating) ? 'fill-current' : ''}
                  style={{ color: n <= (hoverRating || rating) ? '#F5A623' : 'var(--color-border)' }}
                />
              </button>
            ))}
          </div>
          {rating > 0 && (
            <FormTextarea
              placeholder="Anything you'd like to share? (optional)"
              value={feedback}
              onChange={(e) => setFeedback(e.target.value)}
              rows={3}
            />
          )}
          <div className="flex gap-2 w-full mt-1">
            <Button variant="secondary" onClick={onDone} fullWidth disabled={submitting}>
              Skip
            </Button>
            <Button onClick={handleSubmit} fullWidth disabled={rating === 0 || submitting}>
              Submit
            </Button>
          </div>
        </div>
      </Card>
    </div>
  )
}
