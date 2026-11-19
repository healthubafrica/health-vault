import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const drive = vi.fn()
let config: any
vi.mock('driver.js', () => ({ driver: (c: any) => ((config = c), { drive }) }))
vi.mock('driver.js/dist/driver.css', () => ({}))
const track = vi.fn()
vi.mock('@/lib/api', () => ({ analytics: { track: (...a: unknown[]) => track(...a) } }))

import { startPortalTour } from './portalTour'

// jsdom has no layout, so getClientRects() is always empty; mark the elements
// a real browser would be showing.
function addEl(attr: string, visible: boolean) {
  const el = document.createElement('a')
  el.setAttribute('data-tour', attr)
  el.getClientRects = () => (visible ? [{}] : []) as unknown as DOMRectList
  document.body.appendChild(el)
  return el
}

const allOn = () => true
const titles = () => config.steps.map((s: any) => s.popover.title)

beforeEach(() => {
  document.body.innerHTML = ''
  config = undefined
  drive.mockClear()
  track.mockClear()
})
afterEach(() => vi.clearAllMocks())

describe('startPortalTour', () => {
  it('points at the visible desktop nav link and opens with a welcome and closes with a wrap-up', () => {
    addEl('/appointments', false) // hidden mobile copy
    const desktop = addEl('/appointments', true)
    startPortalTour(allOn, () => undefined)
    const appts = config.steps.find((s: any) => s.popover.title === 'Appointments')
    expect(appts.element).toBe(desktop)
    expect(titles()[0]).toBe('Welcome to MyHealth Vault+™')
    expect(titles().at(-1)).toBe("You're all set")
    expect(drive).toHaveBeenCalledOnce()
    expect(track).toHaveBeenCalledWith('tour_started', expect.objectContaining({ feature_area: 'onboarding' }))
  })

  it('on mobile, falls back to the More button and says to tap it', () => {
    const more = addEl('more', true)
    addEl('/vault', false)
    startPortalTour(allOn, () => undefined)
    const vault = config.steps.find((s: any) => s.popover.title === 'My Vault')
    expect(vault.element).toBe(more)
    expect(vault.popover.description).toContain('Tap <b>More</b>')
  })

  it('skips features that are switched off and includes the checklist only when shown', () => {
    addEl('getting-started', true)
    startPortalTour((flag) => flag !== 'teleconsult_enabled', () => undefined)
    expect(titles()).not.toContain('TeleCare™')
    expect(titles()).toContain('Getting started')
  })

  it('reports completed only when the last step was reached, exactly once', () => {
    const onFinish = vi.fn()
    startPortalTour(allOn, onFinish)
    const last = config.steps.length - 1
    config.onHighlighted(undefined, config.steps[last], { state: { activeIndex: last } })
    config.onDestroyed()
    config.onDestroyed()
    expect(onFinish).toHaveBeenCalledOnce()
    expect(onFinish).toHaveBeenCalledWith(true)
    expect(track).toHaveBeenCalledWith('tour_completed', expect.anything())
  })

  it('reports a skip when closed part-way', () => {
    const onFinish = vi.fn()
    startPortalTour(allOn, onFinish)
    config.onHighlighted(undefined, config.steps[2], { state: { activeIndex: 2 } })
    config.onDestroyed()
    expect(onFinish).toHaveBeenCalledWith(false)
    expect(track).toHaveBeenCalledWith('tour_skipped', expect.objectContaining({ step: 3 }))
  })
})
