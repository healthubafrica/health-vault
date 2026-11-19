'use client'

import { driver, type DriveStep } from 'driver.js'
import 'driver.js/dist/driver.css'
import { analytics } from '@/lib/api'

// Nav links carry data-tour="<href>" in both the desktop Sidebar and the
// MobileBottomNav; the mobile "More" button carries data-tour="more". Steps
// point at whichever copy is actually on screen.
const isVisible = (el: Element | null): el is HTMLElement => !!el && (el as HTMLElement).getClientRects().length > 0

function findTarget(selector: string): { el?: HTMLElement; viaMore: boolean } {
  const visible = Array.from(document.querySelectorAll(`[data-tour="${selector}"]`)).find(isVisible)
  if (visible) return { el: visible, viaMore: false }
  const more = document.querySelector('[data-tour="more"]')
  return isVisible(more) ? { el: more, viaMore: true } : { viaMore: false }
}

interface NavStop {
  href: string
  title: string
  description: string
  flag?: string
}

const NAV_STOPS: NavStop[] = [
  { href: '/appointments', title: 'Appointments', description: 'Book a doctor, see upcoming visits and reschedule or cancel when plans change.' },
  { href: '/records', title: 'Records', description: 'Your visit summaries, prescriptions and test results from your care team, in one place.' },
  { href: '/vault', title: 'My Vault', description: 'Upload and keep your own health documents safe, and share them with a doctor when you choose.' },
  { href: '/telecare', title: 'TeleCare™', description: 'See a doctor by video from wherever you are.', flag: 'teleconsult_enabled' },
  { href: '/subscriptions', title: 'Subscriptions', description: 'View or change your plan and what it covers.' },
  { href: '/support', title: 'Support', description: 'Questions or problems? Message our team here. You can also replay this tour from Support.' },
  { href: '/profile', title: 'Your profile', description: 'Keep your details, health information and emergency contact up to date.' },
]

/**
 * Starts the portal welcome tour. `onFinish(completed)` fires once when the
 * tour closes — `completed` is false if the patient skipped part-way.
 */
export function startPortalTour(isEnabled: (flag: string) => boolean, onFinish: (completed: boolean) => void) {
  const steps: DriveStep[] = [
    {
      popover: {
        title: 'Welcome to MyHealth Vault+™',
        description: 'Take a quick 1-minute tour of where everything is. You can skip at any time.',
      },
    },
  ]

  const checklist = document.querySelector('[data-tour="getting-started"]')
  if (isVisible(checklist)) {
    steps.push({
      element: checklist,
      popover: { title: 'Getting started', description: 'A few quick steps to set up your account. Tick them off at your own pace.', side: 'bottom' },
    })
  }

  for (const stop of NAV_STOPS) {
    if (stop.flag && !isEnabled(stop.flag)) continue
    const { el, viaMore } = findTarget(stop.href)
    steps.push({
      element: el,
      popover: {
        title: stop.title,
        description: viaMore ? `${stop.description} Tap <b>More</b> to find it.` : stop.description,
        side: viaMore ? 'top' : 'right',
      },
    })
  }

  steps.push({
    popover: {
      title: "You're all set",
      description: 'Start with the Getting started list on your dashboard. Need help later? Visit Support.',
    },
  })

  let lastIndex = 0
  let finished = false
  const tour = driver({
    steps,
    showProgress: true,
    progressText: '{{current}} of {{total}}',
    nextBtnText: 'Next',
    prevBtnText: 'Back',
    doneBtnText: 'Finish',
    popoverClass: 'hha-tour',
    overlayOpacity: 0.55,
    stagePadding: 6,
    stageRadius: 14,
    onHighlighted: (_el, _step, { state }) => {
      lastIndex = state.activeIndex ?? lastIndex
    },
    onDestroyed: () => {
      if (finished) return
      finished = true
      const completed = lastIndex === steps.length - 1
      analytics.track(completed ? 'tour_completed' : 'tour_skipped', {
        feature_area: 'onboarding',
        step: lastIndex + 1,
        total_steps: steps.length,
      })
      onFinish(completed)
    },
  })

  analytics.track('tour_started', { feature_area: 'onboarding', total_steps: steps.length })
  tour.drive()
}
