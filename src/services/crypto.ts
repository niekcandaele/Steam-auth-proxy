import crypto, { KeyObject } from 'crypto';

export const generateKeyPair = (): { publicKey: KeyObject, privateKey: KeyObject } => {
  const { publicKey, privateKey } = crypto.generateKeyPairSync('rsa', {
    modulusLength: 2048,
    publicKeyEncoding: {
      type: 'spki',
      format: 'pem'
    },
    privateKeyEncoding: {
      type: 'pkcs8',
      format: 'pem'
    }
  });
  return { publicKey: crypto.createPublicKey(publicKey), privateKey: crypto.createPrivateKey(privateKey) };
};

export const generateSecureCode = () => {
  return crypto.randomBytes(32).toString('hex');
};

export const generateCodeChallenge = (verifier: string) => {
  return crypto.createHash('sha256').update(verifier).digest('base64url');
};
