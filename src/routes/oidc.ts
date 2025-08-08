import { Router, Response, NextFunction, Request } from 'express';
import { OIDCDiscoveryDocument } from '../types';
import { getAuthUrl, getUserInfo } from '../services/steamAuth';
import { validateAuthCode, generateIdToken, generateAccessToken, validateAccessToken, publicKey } from '../services/oidcProvider';
import { exportJWK } from 'jose';
import { clientStore } from '../services/storage';
import { config } from '../config';
import { logDebug, logError, sanitize, sanitizeSecret } from '../utils/logging';
import { generateSecureCode } from '../services/crypto';

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

logDebug('OIDC', 'Client initialized', {
  client_id: CLIENT_ID,
  redirect_uris_count: config.allowedRedirectUris.length,
  redirect_uris: config.allowedRedirectUris,
  client_secret: sanitizeSecret(CLIENT_SECRET)
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

  logDebug('OIDC', '/authorize called', {
    client_id: sanitize(client_id as string, 'client'),
    redirect_uri: redirect_uri,
    response_type: response_type,
    scope: scope,
    state: state,
    nonce: nonce ? sanitize(nonce as string, 'nonce') : undefined
  });

  const client = clientStore.get(client_id as string);
  if (!client) {
    logError('OIDC', 'Client not found', { client_id: sanitize(client_id as string, 'client') });
    return sendOidcError(res, redirect_uri as string, 'unauthorized_client', 'Invalid client_id');
  }
  logDebug('OIDC', 'Client validated successfully');

  if (!client.redirect_uris.includes(redirect_uri as string)) {
    logError('OIDC', 'Invalid redirect_uri', { 
      provided: redirect_uri,
      allowed: client.redirect_uris 
    });
    return sendOidcError(res, redirect_uri as string, 'invalid_request', 'Invalid redirect_uri');
  }
  logDebug('OIDC', 'Redirect URI validated');

  if (response_type !== 'code') {
    logError('OIDC', 'Unsupported response_type', { response_type });
    return sendOidcError(res, redirect_uri as string, 'unsupported_response_type', 'Invalid response_type');
  }

  try {
    logDebug('OIDC', 'Generating Steam auth URL');
    const authUrl = await getAuthUrl(config.steamReturnUrl);
    
    // @ts-ignore
    req.session.oidc = { client_id, redirect_uri, state, nonce };
    logDebug('OIDC', 'Session data stored', {
      client_id: sanitize(client_id as string, 'client'),
      has_state: !!state,
      has_nonce: !!nonce
    });
    
    logDebug('OIDC', 'Redirecting to Steam auth');
    res.redirect(authUrl);
  } catch (error) {
    logError('OIDC', 'Failed to generate Steam auth URL', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    sendOidcError(res, redirect_uri as string, 'server_error', `Error generating Steam auth URL: ${errorMessage}`);
  }
});

router.post('/token', async (req, res) => {
  const { grant_type, code, redirect_uri, client_id, client_secret } = req.body;

  logDebug('OIDC', '/token called', {
    grant_type: grant_type,
    code: sanitize(code, 'code'),
    redirect_uri: redirect_uri,
    client_id: sanitize(client_id, 'client'),
    client_secret: sanitizeSecret(client_secret)
  });

  if (grant_type !== 'authorization_code') {
    logError('OIDC', 'Invalid grant_type', { grant_type });
    return res.status(400).json({ error: 'invalid_grant' });
  }

  const client = clientStore.get(client_id as string);
  if (!client || client.client_secret !== client_secret) {
    logError('OIDC', 'Client authentication failed', { 
      client_id: sanitize(client_id, 'client'),
      client_found: !!client,
      secret_matches: client ? client.client_secret === client_secret : false
    });
    return res.status(401).json({ error: 'invalid_client' });
  }
  logDebug('OIDC', 'Client authenticated successfully');

  const authCodeData = validateAuthCode(code, client_id);
  if (!authCodeData || authCodeData.redirectUri !== redirect_uri) {
    logError('OIDC', 'Auth code validation failed', {
      code: sanitize(code, 'code'),
      code_found: !!authCodeData,
      redirect_uri_matches: authCodeData ? authCodeData.redirectUri === redirect_uri : false
    });
    return res.status(400).json({ error: 'invalid_grant' });
  }
  logDebug('OIDC', 'Auth code validated', {
    steamId: authCodeData.steamId,
    has_nonce: !!authCodeData.nonce
  });

  try {
    logDebug('OIDC', 'Fetching Steam user info', { steamId: authCodeData.steamId });
    const user = await getUserInfo(authCodeData.steamId);
    
    logDebug('OIDC', 'Generating tokens');
    const id_token = await generateIdToken(user, client, authCodeData.nonce);
    const access_token = generateAccessToken(authCodeData.steamId);

    logDebug('OIDC', 'Tokens generated successfully', {
      access_token: sanitize(access_token, 'token'),
      id_token: sanitize(id_token, 'jwt'),
      steamId: authCodeData.steamId
    });

    res.json({
      access_token,
      token_type: 'Bearer',
      expires_in: 3600,
      id_token
    });
  } catch (error) {
    logError('OIDC', 'Error generating tokens', error);
    res.status(500).json({ error: 'server_error' });
  }
});

router.get('/userinfo', async (req, res) => {
  const authHeader = req.headers.authorization;
  
  logDebug('OIDC', '/userinfo called', {
    has_auth_header: !!authHeader,
    auth_header: authHeader ? sanitize(authHeader, 'bearer') : undefined
  });
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    logError('OIDC', 'Invalid authorization header', { authHeader });
    return res.status(401).json({ error: 'invalid_token' });
  }

  const token = authHeader.substring(7);
  logDebug('OIDC', 'Validating access token', { token: sanitize(token, 'token') });
  
  try {
    const steamId = await validateAccessToken(token);
    if (!steamId) {
      logError('OIDC', 'Invalid access token', { token: sanitize(token, 'token') });
      return res.status(401).json({ error: 'invalid_token' });
    }
    
    logDebug('OIDC', 'Access token validated', { steamId });
    const user = await getUserInfo(steamId);
    
    logDebug('OIDC', 'Returning user info', { 
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
    logError('OIDC', 'Error fetching user info', error);
    res.status(500).json({ error: 'server_error' });
  }
});

export default router;
