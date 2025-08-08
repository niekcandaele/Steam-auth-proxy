import { Router } from 'express';
import { verifyAssertion } from '../services/steamAuth';
import { generateAuthCode } from '../services/oidcProvider';
import { OpenIDParams } from '../types';
import { logDebug, logError, sanitize } from '../utils/logging';

const router = Router();

router.get('/auth/steam/return', async (req, res) => {
  logDebug('Steam', 'Callback received', {
    query_params: Object.keys(req.query),
    has_openid_params: !!req.query['openid.claimed_id']
  });
  
  try {
    logDebug('Steam', 'Verifying Steam assertion');
    const steamId = await verifyAssertion(req);
    logDebug('Steam', 'Steam ID verified', { steamId });
    
    // @ts-ignore
    const { client_id, redirect_uri, state, nonce } = req.session.oidc || {};
    // @ts-ignore
    const sessionData = req.session.oidc;
    
    logDebug('Steam', 'Retrieved session data', {
      client_id: sanitize(client_id, 'client'),
      redirect_uri: redirect_uri,
      has_state: !!state,
      has_nonce: !!nonce,
      session_exists: !!sessionData
    });
    
    if (!client_id || !redirect_uri) {
      logError('Steam', 'Missing OIDC session data', {
        has_client_id: !!client_id,
        has_redirect_uri: !!redirect_uri,
        session_id: sanitize(req.sessionID, 'session')
      });
      return res.status(400).send('Session expired or invalid. Please try logging in again.');
    }
    
    logDebug('Steam', 'Generating auth code');
    const code = generateAuthCode(steamId, client_id, redirect_uri, nonce);
    
    const url = new URL(redirect_uri);
    url.searchParams.append('code', code);
    if (state) {
      url.searchParams.append('state', state);
    }
    
    logDebug('Steam', 'Redirecting to client', {
      redirect_uri: redirect_uri,
      code: sanitize(code, 'code'),
      state: state,
      full_url: url.toString()
    });
    
    res.redirect(url.toString());
  } catch (error) {
    logError('Steam', 'Error in callback', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    res.status(500).send(`Error verifying Steam assertion: ${errorMessage}`);
  }
});

export default router;
