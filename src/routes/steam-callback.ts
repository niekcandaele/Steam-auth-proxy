import { Router } from 'express';
import { verifyAssertion } from '../services/steamAuth';
import { generateAuthCode } from '../services/oidcProvider';
import { OpenIDParams } from '../types';

const router = Router();

router.get('/auth/steam/return', async (req, res) => {
  console.log('Steam callback received with query:', req.query);
  
  try {
    const steamId = await verifyAssertion(req);
    // @ts-ignore
    const { client_id, redirect_uri, state, nonce } = req.session.oidc;
    
    if (!client_id || !redirect_uri) {
      console.error('Missing OIDC session data');
      return res.status(400).send('Session expired or invalid. Please try logging in again.');
    }
    
    const code = generateAuthCode(steamId, client_id, redirect_uri, nonce);
    const url = new URL(redirect_uri);
    url.searchParams.append('code', code);
    if (state) {
      url.searchParams.append('state', state);
    }
    console.log('Redirecting to client with code:', { redirect_uri, code, state });
    res.redirect(url.toString());
  } catch (error) {
    console.error('Error in Steam callback:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    res.status(500).send(`Error verifying Steam assertion: ${errorMessage}`);
  }
});

export default router;
