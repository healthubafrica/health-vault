// Single source of truth for the public-facing contact details rendered
// across the marketing site (Contact / FAQ / DispatchCare / Footer).
// Update the numbers here only; every UI element references this object
// so the next change is one edit, not a grep-and-replace tour.

export const CONTACT = {
  whatsapp: {
    // Local dialable format
    local: '07076886101',
    // E.164 international format for tel: links and forms
    e164: '+2347076886101',
    // Human-readable display
    display: '+234 707 688 6101',
    // wa.me deep-link (no plus sign, no spaces)
    waMe: 'https://wa.me/2347076886101',
  },
  emergency: {
    // Vanity branded form for display
    vanity: '0700CALL-HUBCARE',
    // Numeric local equivalent
    local: '07002255482',
    // E.164 for tel: links
    e164: '+2347002255482',
    // Combined display "0700CALL-HUBCARE/07002255482"
    display: '0700CALL-HUBCARE/07002255482',
    tel: 'tel:+2347002255482',
  },
}
