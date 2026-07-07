import { randomBytes } from 'crypto';
import { encryptToken, decryptToken } from './token-crypto.util';

describe('token-crypto.util', () => {
  const originalKey = process.env.TOKEN_ENC_KEY;

  beforeEach(() => {
    process.env.TOKEN_ENC_KEY = randomBytes(32).toString('base64');
  });

  afterAll(() => {
    process.env.TOKEN_ENC_KEY = originalKey;
  });

  it('encrypts and decrypts back to the original value', () => {
    const plainText = 'access-token-1234567890';
    const encrypted = encryptToken(plainText);
    expect(encrypted).not.toEqual(plainText);
    expect(decryptToken(encrypted)).toEqual(plainText);
  });

  it('produces a different ciphertext each time (random IV)', () => {
    const plainText = 'same-value';
    expect(encryptToken(plainText)).not.toEqual(encryptToken(plainText));
  });

  it('throws when TOKEN_ENC_KEY is missing', () => {
    delete process.env.TOKEN_ENC_KEY;
    expect(() => encryptToken('x')).toThrow('TOKEN_ENC_KEY');
  });

  it('throws when TOKEN_ENC_KEY has the wrong length', () => {
    process.env.TOKEN_ENC_KEY = Buffer.from('too-short').toString('base64');
    expect(() => encryptToken('x')).toThrow('32 bytes');
  });
});
