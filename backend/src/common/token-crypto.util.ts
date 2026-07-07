import { createCipheriv, createDecipheriv, randomBytes } from 'crypto';

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 12;

function loadKey(): Buffer {
  const key = process.env.TOKEN_ENC_KEY;
  if (!key) {
    throw new Error('TOKEN_ENC_KEY environment variable is not set.');
  }
  const buffer = Buffer.from(key, 'base64');
  if (buffer.length !== 32) {
    throw new Error(
      'TOKEN_ENC_KEY must decode to 32 bytes (base64 of an AES-256 key).',
    );
  }
  return buffer;
}

// Formato: iv.authTag.ciphertext, cada segmento em base64
export function encryptToken(plainText: string): string {
  const key = loadKey();
  const iv = randomBytes(IV_LENGTH);
  const cipher = createCipheriv(ALGORITHM, key, iv);
  const ciphertext = Buffer.concat([
    cipher.update(plainText, 'utf8'),
    cipher.final(),
  ]);
  const authTag = cipher.getAuthTag();
  return [
    iv.toString('base64'),
    authTag.toString('base64'),
    ciphertext.toString('base64'),
  ].join('.');
}

export function decryptToken(encrypted: string): string {
  const key = loadKey();
  const [ivB64, authTagB64, ciphertextB64] = encrypted.split('.');
  if (!ivB64 || !authTagB64 || !ciphertextB64) {
    throw new Error('Invalid encrypted token format.');
  }
  const iv = Buffer.from(ivB64, 'base64');
  const authTag = Buffer.from(authTagB64, 'base64');
  const ciphertext = Buffer.from(ciphertextB64, 'base64');
  const decipher = createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(authTag);
  const plaintext = Buffer.concat([
    decipher.update(ciphertext),
    decipher.final(),
  ]);
  return plaintext.toString('utf8');
}
