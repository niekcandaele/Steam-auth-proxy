import { Router, Response, NextFunction, Request } from 'express';
import { OIDCDiscoveryDocument } from '../types';
import { getAuthUrl, getUserInfo } from '../services/steamAuth';
import { validateAuthCode, generateIdToken, generateAccessToken, validateAccessToken, publicKey } from '../services/oidcProvider';
import { exportJWK } from 'jose';
import { clientStore } from '../services/storage';
import { config } from '../config';

const router = Router();

const loadClientConfig = (req: Request, res: Response, next: NextFunction) => {
  // In a real app, you would load this from a database
  clientStore.set(config.oidcClientId || '', {
    client_id: config.oidcClientId || '',
    client_secret: config.oidcClientSecret || '',
    redirect_uris: [config.baseUrl],
    grant_types: ['authorization_code'],
    response_types: ['code'],
    scope: 'openid profile'
  });
  next();
};

router.use(loadClientConfig);

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

  const client = clientStore.get(client_id as string);
  if (!client) {
    return sendOidcError(res, redirect_uri as string, 'unauthorized_client', 'Invalid client_id');
  }

  if (!client.redirect_uris.includes(redirect_uri as string)) {
    return sendOidcError(res, redirect_uri as string, 'invalid_request', 'Invalid redirect_uri');
  }

  if (response_type !== 'code') {
    return sendOidcError(res, redirect_uri as string, 'unsupported_response_type', 'Invalid response_type');
  }

  try {
    const authUrl = await getAuthUrl(config.steamReturnUrl);
    // @ts-ignore
    req.session.oidc = { client_id, redirect_uri, state, nonce };
    res.redirect(authUrl);
  } catch (error) {
    console.error('Failed to generate Steam auth URL:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    sendOidcError(res, redirect_uri as string, 'server_error', `Error generating Steam auth URL: ${errorMessage}`);
  }
});

router.post('/token', async (req, res) => {
  const { grant_type, code, redirect_uri, client_id, client_secret } = req.body;

  if (grant_type !== 'authorization_code') {
    return res.status(400).json({ error: 'invalid_grant' });
  }

  const client = clientStore.get(client_id as string);
  if (!client || client.client_secret !== client_secret) {
    return res.status(401).json({ error: 'invalid_client' });
  }

  const authCodeData = validateAuthCode(code, client_id);
  if (!authCodeData || authCodeData.redirectUri !== redirect_uri) {
    return res.status(400).json({ error: 'invalid_grant' });
  }

  try {
    const user = await getUserInfo(authCodeData.steamId);
    const id_token = await generateIdToken(user, client, authCodeData.nonce);
    const access_token = generateAccessToken(authCodeData.steamId);

    res.json({
      access_token,
      token_type: 'Bearer',
      expires_in: 3600,
      id_token
    });
  } catch (error) {
    res.status(500).json({ error: 'server_error' });
  }
});

router.get('/userinfo', async (req, res) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'invalid_token' });
  }

  const token = authHeader.substring(7);
  try {
    const steamId = await validateAccessToken(token);
    if (!steamId) {
      return res.status(401).json({ error: 'invalid_token' });
    }
    const user = await getUserInfo(steamId);
    res.json({
      sub: user.steamid,
      name: user.personaname,
      picture: user.avatarfull,
      profile: user.profileurl
    });
  } catch (error) {
    res.status(500).json({ error: 'server_error' });
  }
});

export default router;
