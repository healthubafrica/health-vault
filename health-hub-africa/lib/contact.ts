// Single source of truth for the public-facing contact details rendered
// inside the patient portal (DispatchCare emergency call CTAs, support
// links). Update the numbers here only; every UI element references this
// object so the next change is one edit.

export const CONTACT = {
  whatsapp: {
    local: '07076886101',
    e164: '+2347076886101',
    display: '+234 707 688 6101',
    waMe: 'https://wa.me/2347076886101',
  },
  emergency: {
    vanity: '0700CALL-HUBCARE',
    local: '07002255482',
    e164: '+2347002255482',
    display: '0700CALL-HUBCARE/07002255482',
    tel: 'tel:+2347002255482',
  },
}
