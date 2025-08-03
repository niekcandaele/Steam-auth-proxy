import { OpenIDParams, SteamUser } from '../types';
import axios from 'axios';
import openid, { OpenIdError } from 'openid';
import { config } from '../config';
import { Request } from 'express';

const STEAM_OPENID_URL = 'https://steamcommunity.com/openid';

export const getAuthUrl = async (returnUrl: string): Promise<string> => {
  console.log('getAuthUrl called with:', { returnUrl, steamRealm: config.steamRealm });
  
  // Create RelyingParty with stateless mode
  const relyingParty = new openid.RelyingParty(
    returnUrl,
    config.steamRealm || null,
    true,  // stateless
    true,  // strict
    []     // extensions
  );

  return new Promise((resolve, reject) => {
    relyingParty.authenticate(STEAM_OPENID_URL, false, (err: OpenIdError | null, authUrl?: string | null) => {
      if (err) {
        console.error('Error from openid.authenticate:', err);
        console.error('Error message:', err.message);
        return reject(new Error(err.message));
      }
      if (!authUrl) {
        console.error('Authentication URL not generated.');
        return reject(new Error('Authentication URL not generated.'));
      }
      console.log('Generated auth URL:', authUrl);
      resolve(authUrl);
    });
  });
};

export const verifyAssertion = async (requestOrParams: Request | OpenIDParams): Promise<string> => {
  // If it's an Express Request object, we need to extract the return URL from query params
  const returnUrl = 'method' in requestOrParams 
    ? (requestOrParams.query['openid.return_to'] as string)
    : requestOrParams['openid.return_to'];
    
  const relyingParty = new openid.RelyingParty(
    returnUrl,
    config.steamRealm || null,
    true,  // stateless
    true,  // strict
    []     // extensions
  );

  return new Promise((resolve, reject) => {
    relyingParty.verifyAssertion(requestOrParams, (err: OpenIdError | null, result?: { authenticated: boolean; claimedIdentifier?: string; }) => {
      if (err) {
        console.error('Error verifying assertion:', err);
        return reject(new Error(err.message));
      }
      if (!result || !result.authenticated || !result.claimedIdentifier) {
        console.error('Invalid verification result:', result);
        return reject(new Error('Failed to verify assertion.'));
      }
      const steamId = result.claimedIdentifier.split('/').pop() || '';
      console.log('Successfully verified Steam ID:', steamId);
      resolve(steamId);
    });
  });
};

export const getUserInfo = async (steamId: string): Promise<SteamUser> => {
  const apiKey = config.steamApiKey;
  if (!apiKey) {
    throw new Error('Steam API key not configured.');
  }

  const response = await axios.get(
    `http://api.steampowered.com/ISteamUser/GetPlayerSummaries/v0002/?key=${apiKey}&steamids=${steamId}`
  );

  const player = response.data.response.players[0];
  if (!player) {
    throw new Error('User not found.');
  }

  return player;
};
