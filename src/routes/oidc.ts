import { Router, Response, NextFunction, Request } from 'express';
import { OIDCDiscoveryDocument } from '../types';
import { getAuthUrl, getUserInfo } from '../services/steamAuth';
import { validateAuthCode, generateIdToken, generateAccessToken, validateAccessToken, publicKey } from '../services/oidcProvider';
import { exportJWK } from 'jose';
import { clientStore } from '../services/storage';
import { config } from '../config';
import { sanitize, sanitizeSecret } from '../utils/logging';
import { generateSecureCode } from '../services/crypto';
import logger from '../utils/logger';

const router = Router();

// Fixed client configuration
const CLIENT_ID = 'steam-auth-client';
const CLIENT_SECRET = process.env.OIDC_CLIENT_SECRET || generateSecureCode();

// Initialize the single client once on startup
clientStore.set(CLIENT_ID, {
  client_id: CLIENT_ID,
  client_secret: CLIENT_SECRET,
  redirect_uris: config.allowedRedirectUris,
  grant_types: ['authorization_code'],
  response_types: ['code'],
  scope: 'openid profile'
});

logger.debug('Client initialized', {
  context: 'OIDC',
  clientId: CLIENT_ID,
  redirectUrisCount: config.allowedRedirectUris.length,
  redirectUris: config.allowedRedirectUris,
  clientSecret: sanitizeSecret(CLIENT_SECRET)
});

const sendOidcError = (res: Response, redirect_uri: string, error: string, error_description: string) => {
  if (redirect_uri) {
    const url = new URL(redirect_uri);
    url.searchParams.append('error', error);
    url.searchParams.append('error_description', error_description);
    return res.redirect(url.toString());
  }
  res.status(400).json({ error, error_description });
};

router.get('/.well-known/openid-configuration', (req, res) => {
  const discoveryDocument: OIDCDiscoveryDocument = {
    issuer: config.baseUrl,
    authorization_endpoint: `${config.baseUrl}/authorize`,
    token_endpoint: `${config.baseUrl}/token`,
    userinfo_endpoint: `${config.baseUrl}/userinfo`,
    jwks_uri: `${config.baseUrl}/.well-known/jwks.json`,
    response_types_supported: ['code'],
    subject_types_supported: ['public'],
    id_token_signing_alg_values_supported: ['RS256'],
    scopes_supported: ['openid', 'profile'],
    token_endpoint_auth_methods_supported: ['client_secret_post'],
    claims_supported: ['sub', 'iss', 'aud', 'exp', 'iat', 'name', 'picture', 'profile'],
    grant_types_supported: ['authorization_code']
  };
  res.json(discoveryDocument);
});

router.get('/.well-known/jwks.json', async (req, res) => {
  const jwk = await exportJWK(publicKey);
  res.json({ keys: [jwk] });
});

router.get('/authorize', async (req, res) => {
  const { client_id, redirect_uri, response_type, scope, state, nonce } = req.query;

  logger.debug('/authorize called', {
    context: 'OIDC',
    clientId: sanitize(client_id as string, 'client'),
    redirectUri: redirect_uri,
    responseType: response_type,
    scope: scope,
    state: state,
    nonce: nonce ? sanitize(nonce as string, 'nonce') : undefined
  });

  const client = clientStore.get(client_id as string);
  if (!client) {
    logger.error('Client not found', { 
      context: 'OIDC',
      clientId: sanitize(client_id as string, 'client') 
    });
    return sendOidcError(res, redirect_uri as string, 'unauthorized_client', 'Invalid client_id');
  }
  logger.debug('Client validated successfully', { context: 'OIDC' });

  if (!client.redirect_uris.includes(redirect_uri as string)) {
    logger.error('Invalid redirect_uri', { 
      context: 'OIDC',
      provided: redirect_uri,
      allowed: client.redirect_uris 
    });
    return sendOidcError(res, redirect_uri as string, 'invalid_request', 'Invalid redirect_uri');
  }
  logger.debug('Redirect URI validated', { context: 'OIDC' });

  if (response_type !== 'code') {
    logger.error('Unsupported response_type', { 
      context: 'OIDC',
      responseType: response_type 
    });
    return sendOidcError(res, redirect_uri as string, 'unsupported_response_type', 'Invalid response_type');
  }

  try {
    logger.debug('Generating Steam auth URL', { context: 'OIDC' });
    const authUrl = await getAuthUrl(config.steamReturnUrl);
    
    // @ts-ignore
    req.session.oidc = { client_id, redirect_uri, state, nonce };
    logger.debug('Session data stored', {
      context: 'OIDC',
      clientId: sanitize(client_id as string, 'client'),
      hasState: !!state,
      hasNonce: !!nonce
    });
    
    logger.debug('Redirecting to Steam auth', { context: 'OIDC' });
    res.redirect(authUrl);
  } catch (error) {
    logger.error('Failed to generate Steam auth URL', {
      context: 'OIDC',
      error: error instanceof Error ? error.message : error
    });
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    sendOidcError(res, redirect_uri as string, 'server_error', `Error generating Steam auth URL: ${errorMessage}`);
  }
});

router.post('/token', async (req, res) => {
  const { grant_type, code, redirect_uri, client_id, client_secret } = req.body;

  logger.debug('/token called', {
    context: 'OIDC',
    grantType: grant_type,
    code: sanitize(code, 'code'),
    redirectUri: redirect_uri,
    clientId: sanitize(client_id, 'client'),
    clientSecret: sanitizeSecret(client_secret)
  });

  if (grant_type !== 'authorization_code') {
    logger.error('Invalid grant_type', { 
      context: 'OIDC',
      grantType: grant_type 
    });
    return res.status(400).json({ error: 'invalid_grant' });
  }

  const client = clientStore.get(client_id as string);
  if (!client || client.client_secret !== client_secret) {
    logger.error('Client authentication failed', { 
      context: 'OIDC',
      clientId: sanitize(client_id, 'client'),
      clientFound: !!client,
      secretMatches: client ? client.client_secret === client_secret : false
    });
    return res.status(401).json({ error: 'invalid_client' });
  }
  logger.debug('Client authenticated successfully', { context: 'OIDC' });

  const authCodeData = validateAuthCode(code, client_id);
  if (!authCodeData || authCodeData.redirectUri !== redirect_uri) {
    logger.error('Auth code validation failed', {
      context: 'OIDC',
      code: sanitize(code, 'code'),
      codeFound: !!authCodeData,
      redirectUriMatches: authCodeData ? authCodeData.redirectUri === redirect_uri : false
    });
    return res.status(400).json({ error: 'invalid_grant' });
  }
  logger.debug('Auth code validated', {
    context: 'OIDC',
    steamId: authCodeData.steamId,
    hasNonce: !!authCodeData.nonce
  });

  try {
    logger.debug('Fetching Steam user info', { 
      context: 'OIDC',
      steamId: authCodeData.steamId 
    });
    const user = await getUserInfo(authCodeData.steamId);
    
    logger.debug('Generating tokens', { context: 'OIDC' });
    const id_token = await generateIdToken(user, client, authCodeData.nonce);
    const access_token = generateAccessToken(authCodeData.steamId);

    logger.debug('Tokens generated successfully', {
      context: 'OIDC',
      accessToken: sanitize(access_token, 'token'),
      idToken: sanitize(id_token, 'jwt'),
      steamId: authCodeData.steamId
    });

    res.json({
      access_token,
      token_type: 'Bearer',
      expires_in: 3600,
      id_token
    });
  } catch (error) {
    logger.error('Error generating tokens', {
      context: 'OIDC',
      error: error instanceof Error ? error.message : error
    });
    res.status(500).json({ error: 'server_error' });
  }
});

router.get('/userinfo', async (req, res) => {
  const authHeader = req.headers.authorization;
  
  logger.debug('/userinfo called', {
    context: 'OIDC',
    hasAuthHeader: !!authHeader,
    authHeader: authHeader ? sanitize(authHeader, 'bearer') : undefined
  });
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    logger.error('Invalid authorization header', { 
      context: 'OIDC',
      authHeader 
    });
    return res.status(401).json({ error: 'invalid_token' });
  }

  const token = authHeader.substring(7);
  logger.debug('Validating access token', { 
    context: 'OIDC',
    token: sanitize(token, 'token') 
  });
  
  try {
    const steamId = await validateAccessToken(token);
    if (!steamId) {
      logger.error('Invalid access token', { 
        context: 'OIDC',
        token: sanitize(token, 'token') 
      });
      return res.status(401).json({ error: 'invalid_token' });
    }
    
    logger.debug('Access token validated', { 
      context: 'OIDC',
      steamId 
    });
    const user = await getUserInfo(steamId);
    
    logger.debug('Returning user info', { 
      context: 'OIDC',
      steamId: user.steamid,
      personaname: user.personaname 
    });
    
    res.json({
      sub: user.steamid,
      name: user.personaname,
      picture: user.avatarfull,
      profile: user.profileurl
    });
  } catch (error) {
    logger.error('Error fetching user info', {
      context: 'OIDC',
      error: error instanceof Error ? error.message : error
    });
    res.status(500).json({ error: 'server_error' });
  }
});

export default router;
