import { SteamUser, OIDCClient, AuthCodeData, IDTokenClaims } from '../types';
import { SignJWT, importJWK, jwtVerify, JWTPayload } from 'jose';
import { generateSecureCode, generateKeyPair } from './crypto';
import { codeStore, tokenStore } from './storage';
import { sanitize, formatTimeRemaining } from '../utils/logging';
import logger from '../utils/logger';

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
  
  logger.debug('Generating auth code', {
    context: 'OIDCProvider',
    code: sanitize(code, 'code'),
    steamId: steamId,
    clientId: sanitize(clientId, 'client'),
    redirectUri: redirectUri,
    has_nonce: !!nonce,
    expires_in: '10 minutes'
  });
  
  codeStore.set(code, authCodeData);
  return code;
};

export const validateAuthCode = (code: string, clientId: string): AuthCodeData | null => {
  const authCodeData = codeStore.get(code);
  
  logger.debug('Validating auth code', {
    context: 'OIDCProvider',
    code: sanitize(code, 'code'),
    clientId: sanitize(clientId, 'client'),
    code_found: !!authCodeData,
    client_matches: authCodeData ? authCodeData.clientId === clientId : false,
    is_expired: authCodeData ? authCodeData.expiresAt < Date.now() : false,
    time_remaining: authCodeData ? formatTimeRemaining(authCodeData.expiresAt) : 'N/A'
  });
  
  if (!authCodeData || authCodeData.clientId !== clientId || authCodeData.expiresAt < Date.now()) {
    if (authCodeData) {
      logger.error('Auth code validation failed', {
        context: 'OIDCProvider',
        reason: authCodeData.clientId !== clientId ? 'client_mismatch' : 'expired',
        expected_client: sanitize(clientId, 'client'),
        actual_client: sanitize(authCodeData.clientId, 'client'),
        expired: authCodeData.expiresAt < Date.now()
      });
    } else {
      logger.error('Auth code not found', { 
        context: 'OIDCProvider',
        code: sanitize(code, 'code') 
      });
    }
    return null;
  }
  
  logger.debug('Auth code validated successfully, removing from store', {
    context: 'OIDCProvider'
  });
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

  logger.debug('Generating ID token', {
    context: 'OIDCProvider',
    issuer: process.env.OIDC_ISSUER,
    subject: user.steamid,
    audience: sanitize(client.client_id, 'client'),
    has_nonce: !!nonce,
    expires_in: '1 hour'
  });

  const token = await new SignJWT(claims)
    .setProtectedHeader({ alg: 'RS256' })
    .setIssuedAt()
    .setIssuer(process.env.OIDC_ISSUER || '')
    .setAudience(client.client_id)
    .setExpirationTime('1h')
    .sign(privateKey);
    
  logger.debug('ID token generated', {
    context: 'OIDCProvider',
    token_preview: sanitize(token, 'jwt')
  });
  
  return token;
};

export const generateAccessToken = (steamId: string): string => {
  const token = generateSecureCode();
  
  logger.debug('Generating access token', {
    context: 'OIDCProvider',
    steamId: steamId,
    token: sanitize(token, 'token')
  });
  
  tokenStore.set(token, steamId);
  return token;
};

export const validateAccessToken = async (token: string): Promise<string | null> => {
  const steamId = tokenStore.get(token);
  
  logger.debug('Validating access token', {
    context: 'OIDCProvider',
    token: sanitize(token, 'token'),
    found: !!steamId,
    steamId: steamId || 'N/A'
  });
  
  if (!steamId) {
    logger.error('Access token not found', { 
      context: 'OIDCProvider',
      token: sanitize(token, 'token') 
    });
    return null;
  }
  
  return steamId;
};

export { publicKey };
