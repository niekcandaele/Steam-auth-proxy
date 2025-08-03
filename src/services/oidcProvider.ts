import { SteamUser, OIDCClient, AuthCodeData, IDTokenClaims } from '../types';
import { SignJWT, importJWK, jwtVerify, JWTPayload } from 'jose';
import { generateSecureCode, generateKeyPair } from './crypto';
import { codeStore, tokenStore } from './storage';

const { privateKey, publicKey } = generateKeyPair();

export const generateAuthCode = (steamId: string, clientId: string, redirectUri: string, nonce?: string): string => {
  const code = generateSecureCode();
  const authCodeData: AuthCodeData = {
    code,
    steamId,
    clientId,
    redirectUri,
    nonce,
    createdAt: Date.now(),
    expiresAt: Date.now() + 10 * 60 * 1000, // 10 minutes
  };
  codeStore.set(code, authCodeData);
  return code;
};

export const validateAuthCode = (code: string, clientId: string): AuthCodeData | null => {
  const authCodeData = codeStore.get(code);
  if (!authCodeData || authCodeData.clientId !== clientId || authCodeData.expiresAt < Date.now()) {
    return null;
  }
  codeStore.delete(code);
  return authCodeData;
};

export const generateIdToken = async (user: SteamUser, client: OIDCClient, nonce?: string): Promise<string> => {
  const claims: IDTokenClaims & JWTPayload = {
    iss: process.env.OIDC_ISSUER || '',
    sub: user.steamid,
    aud: client.client_id,
    exp: Math.floor(Date.now() / 1000) + 3600, // 1 hour
    iat: Math.floor(Date.now() / 1000),
    name: user.personaname,
    picture: user.avatarfull,
    profile: user.profileurl,
    ...(nonce && { nonce })
  };

  return new SignJWT(claims)
    .setProtectedHeader({ alg: 'RS256' })
    .setIssuedAt()
    .setIssuer(process.env.OIDC_ISSUER || '')
    .setAudience(client.client_id)
    .setExpirationTime('1h')
    .sign(privateKey);
};

export const generateAccessToken = (steamId: string): string => {
  const token = generateSecureCode();
  tokenStore.set(token, steamId);
  return token;
};

export const validateAccessToken = async (token: string): Promise<string | null> => {
  const steamId = tokenStore.get(token);
  if (!steamId) {
    return null;
  }
  return steamId;
};

export { publicKey };
