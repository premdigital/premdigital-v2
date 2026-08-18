// src/utils/crypto.ts
import * as fs from 'fs';
import * as crypto from 'crypto';

/**
 * Encrypt plaintext using RSA public key (OAEP SHA-256).
 * Returns base64 ciphertext.
 * pubKeyPath: path to PEM public key file.
 */
export function encryptWithPublicKey(pubKeyPath: string, plaintext: string): string {
  if (!fs.existsSync(pubKeyPath)) throw new Error(`Public key not found: ${pubKeyPath}`);
  const pub = fs.readFileSync(pubKeyPath);
  const buffer = Buffer.from(plaintext, 'utf8');
  const encrypted = crypto.publicEncrypt({
    key: pub,
    padding: crypto.constants.RSA_PKCS1_OAEP_PADDING,
    oaepHash: 'sha256'
  }, buffer);
  return encrypted.toString('base64');
}

/**
 * Convenience: read public key path from env ADMIN_PUBLIC_KEY_PATH or default
 */
export function encryptWithPublicKeyFromEnv(plaintext: string): string {
  const p = process.env.ADMIN_PUBLIC_KEY_PATH || '/etc/premdigital/admin_pub.pem';
  return encryptWithPublicKey(p, plaintext);
}
