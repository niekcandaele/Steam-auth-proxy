import { Router } from 'express';
import { verifyAssertion } from '../services/steamAuth';
import { generateAuthCode } from '../services/oidcProvider';
import { OpenIDParams } from '../types';
import { sanitize } from '../utils/logging';
import logger from '../utils/logger';

const router = Router();

router.get('/auth/steam/return', async (req, res) => {
  logger.debug('Callback received', {
    context: 'Steam',
    queryParams: Object.keys(req.query),
    hasOpenidParams: !!req.query['openid.claimed_id']
  });
  
  try {
    logger.debug('Verifying Steam assertion', { context: 'Steam' });
    const steamId = await verifyAssertion(req);
    logger.debug('Steam ID verified', { 
      context: 'Steam',
      steamId 
    });
    
    // @ts-ignore
    const { client_id, redirect_uri, state, nonce } = req.session.oidc || {};
    // @ts-ignore
    const sessionData = req.session.oidc;
    
    logger.debug('Retrieved session data', {
      context: 'Steam',
      clientId: sanitize(client_id, 'client'),
      redirectUri: redirect_uri,
      hasState: !!state,
      hasNonce: !!nonce,
      sessionExists: !!sessionData
    });
    
    if (!client_id || !redirect_uri) {
      logger.error('Missing OIDC session data', {
        context: 'Steam',
        hasClientId: !!client_id,
        hasRedirectUri: !!redirect_uri,
        sessionId: sanitize(req.sessionID, 'session')
      });
      return res.status(400).send('Session expired or invalid. Please try logging in again.');
    }
    
    logger.debug('Generating auth code', { context: 'Steam' });
    const code = generateAuthCode(steamId, client_id, redirect_uri, nonce);
    
    const url = new URL(redirect_uri);
    url.searchParams.append('code', code);
    if (state) {
      url.searchParams.append('state', state);
    }
    
    logger.debug('Redirecting to client', {
      context: 'Steam',
      redirectUri: redirect_uri,
      code: sanitize(code, 'code'),
      state: state,
      fullUrl: url.toString()
    });
    
    res.redirect(url.toString());
  } catch (error) {
    logger.error('Error in callback', {
      context: 'Steam',
      error: error instanceof Error ? error.message : error
    });
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    res.status(500).send(`Error verifying Steam assertion: ${errorMessage}`);
  }
});

export default router;
