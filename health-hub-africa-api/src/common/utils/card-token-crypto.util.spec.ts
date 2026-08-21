import { randomBytes } from 'crypto';
import { encryptCardToken, decryptCardToken } from './card-token-crypto.util';

const KEY = randomBytes(32).toString('base64');

describe('card-token-crypto', () => {
  it('round-trips a token through encrypt then decrypt', () => {
    const token = 'flw-t1nf-ea6dbca75a26cbf7104894e5b8f7cd80-m03k';
    const encrypted = encryptCardToken(token, KEY);
    expect(encrypted).not.toContain(token);
    expect(decryptCardToken(encrypted, KEY)).toBe(token);
  });

  it('produces a different ciphertext each time (random IV)', () => {
    const token = 'flw-t1nf-same-token';
    expect(encryptCardToken(token, KEY)).not.toBe(encryptCardToken(token, KEY));
  });

  it('rejects a key that is not 32 bytes', () => {
    expect(() => encryptCardToken('x', 'too-short')).toThrow();
  });

  it('rejects a tampered ciphertext', () => {
    const encrypted = encryptCardToken('flw-t1nf-token', KEY);
    const [iv, tag, data] = encrypted.split('.');
    const tampered = `${iv}.${tag}.${data.slice(0, -2)}AA`;
    expect(() => decryptCardToken(tampered, KEY)).toThrow();
  });
});
