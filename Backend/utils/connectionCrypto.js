import { createCipheriv, createDecipheriv, randomBytes } from 'node:crypto';

function getEncryptionKey() {
  const key = Buffer.from(process.env.CONNECTION_ENCRYPTION_KEY || '', 'base64');
  if (key.length !== 32) {
    throw new Error('CONNECTION_ENCRYPTION_KEY must be a base64-encoded 32-byte key.');
  }
  return key;
}

export function validateEncryptionKey() {
  getEncryptionKey();
}

export function encryptPassword(password) {
  const iv = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', getEncryptionKey(), iv);
  const encrypted = Buffer.concat([cipher.update(password, 'utf8'), cipher.final()]);
  return [iv, cipher.getAuthTag(), encrypted].map((part) => part.toString('base64')).join(':');
}

export function decryptPassword(encryptedPassword) {
  const [ivText, tagText, encryptedText] = encryptedPassword.split(':');
  const decipher = createDecipheriv(
    'aes-256-gcm',
    getEncryptionKey(),
    Buffer.from(ivText, 'base64'),
  );
  decipher.setAuthTag(Buffer.from(tagText, 'base64'));
  return Buffer.concat([
    decipher.update(Buffer.from(encryptedText, 'base64')),
    decipher.final(),
  ]).toString('utf8');
}
