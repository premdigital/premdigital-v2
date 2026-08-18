// scripts/decrypt_rsa.js
const fs = require('fs');
const crypto = require('crypto');
const argv = require('minimist')(process.argv.slice(2));

function usage() {
  console.log('Usage: node scripts/decrypt_rsa.js --data "<base64>" --key /path/to/private.pem');
}

if (!argv.data || !argv.key) { usage(); process.exit(1); }

const dataB64 = argv.data;
const keyPath = argv.key;
if (!fs.existsSync(keyPath)) { console.error('Private key not found:', keyPath); process.exit(2); }

try {
  const priv = fs.readFileSync(keyPath);
  const cipherBuf = Buffer.from(dataB64, 'base64');
  const plain = crypto.privateDecrypt({ key: priv, padding: crypto.constants.RSA_PKCS1_OAEP_PADDING, oaepHash: 'sha256' }, cipherBuf);
  console.log('Decrypted:', plain.toString('utf8'));
} catch (e) { console.error('Decrypt failed:', e.message); process.exit(3); }
