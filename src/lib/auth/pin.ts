import { scrypt, randomBytes, timingSafeEqual } from 'crypto';
import { promisify } from 'util';

const scryptAsync = promisify(scrypt);

/**
 * Hashes a 4-6 digit security PIN with a random salt using scrypt.
 */
export async function hashPin(pin: string): Promise<string> {
  const salt = randomBytes(16).toString('hex');
  const derivedKey = (await scryptAsync(pin, salt, 64)) as Buffer;
  return `${salt}:${derivedKey.toString('hex')}`;
}

/**
 * Verifies a PIN against a stored salt:hash string.
 */
export async function verifyPin(pin: string, storedHash: string): Promise<boolean> {
  try {
    const [salt, key] = storedHash.split(':');
    if (!salt || !key) return false;
    const keyBuffer = Buffer.from(key, 'hex');
    const derivedKey = (await scryptAsync(pin, salt, 64)) as Buffer;
    return timingSafeEqual(keyBuffer, derivedKey);
  } catch {
    return false;
  }
}
