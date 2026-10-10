import { describe, expect, it } from 'vitest'
import { mobileReturnUrl } from './mobileReturn'

describe('mobileReturnUrl', () => {
  it('returns null for the default web flow', () => {
    expect(mobileReturnUrl({ reference: 'abc' })).toBeNull()
    expect(mobileReturnUrl({ client: 'web', reference: 'abc' })).toBeNull()
  })

  it('builds the deep link from a Paystack return', () => {
    expect(mobileReturnUrl({ client: 'mobile', reference: 'ref-1', trxref: 'ref-1' })).toBe(
      'myhealthvault://payments/verify?reference=ref-1',
    )
  })

  it('builds the deep link from a Flutterwave return, carrying status', () => {
    expect(
      mobileReturnUrl({ client: 'mobile', status: 'successful', tx_ref: 'tx 1', transaction_id: '99' }),
    ).toBe('myhealthvault://payments/verify?reference=tx+1&status=successful')
  })

  it('falls back to trxref and tolerates repeated params', () => {
    expect(mobileReturnUrl({ client: ['mobile'], trxref: ['t-9', 'x'] })).toBe(
      'myhealthvault://payments/verify?reference=t-9',
    )
  })

  it('still returns a deep link when no reference came back', () => {
    expect(mobileReturnUrl({ client: 'mobile', status: 'cancelled' })).toBe(
      'myhealthvault://payments/verify?status=cancelled',
    )
  })
})
