import { OpenIDParams, SteamUser } from '../types';
import axios from 'axios';
import openid, { OpenIdError } from 'openid';
import { config } from '../config';
import { Request } from 'express';
import { logDebug, logError, sanitize } from '../utils/logging';

const STEAM_OPENID_URL = 'https://steamcommunity.com/openid';

export const getAuthUrl = async (returnUrl: string): Promise<string> => {
  logDebug('SteamAuth', 'getAuthUrl called', { 
    returnUrl: returnUrl,
    steamRealm: config.steamRealm,
    steamOpenIdUrl: STEAM_OPENID_URL
  });
  
  // Create RelyingParty with stateless mode
  const relyingParty = new openid.RelyingParty(
    returnUrl,
    config.steamRealm || null,
    true,  // stateless
    true,  // strict
    []     // extensions
  );

  logDebug('SteamAuth', 'RelyingParty created', {
    stateless: true,
    strict: true
  });

  return new Promise((resolve, reject) => {
    relyingParty.authenticate(STEAM_OPENID_URL, false, (err: OpenIdError | null, authUrl?: string | null) => {
      if (err) {
        logError('SteamAuth', 'Error from openid.authenticate', err);
        return reject(new Error(err.message));
      }
      if (!authUrl) {
        logError('SteamAuth', 'Authentication URL not generated', {});
        return reject(new Error('Authentication URL not generated.'));
      }
      logDebug('SteamAuth', 'Auth URL generated successfully', {
        url_length: authUrl.length,
        has_openid_params: authUrl.includes('openid')
      });
      resolve(authUrl);
    });
  });
};

export const verifyAssertion = async (requestOrParams: Request | OpenIDParams): Promise<string> => {
  // If it's an Express Request object, we need to extract the return URL from query params
  const returnUrl = 'method' in requestOrParams 
    ? (requestOrParams.query['openid.return_to'] as string)
    : requestOrParams['openid.return_to'];
  
  logDebug('SteamAuth', 'verifyAssertion called', {
    returnUrl: returnUrl,
    isRequest: 'method' in requestOrParams,
    has_claimed_id: 'method' in requestOrParams 
      ? !!requestOrParams.query['openid.claimed_id']
      : !!requestOrParams['openid.claimed_id']
  });
    
  const relyingParty = new openid.RelyingParty(
    returnUrl,
    config.steamRealm || null,
    true,  // stateless
    true,  // strict
    []     // extensions
  );

  return new Promise((resolve, reject) => {
    logDebug('SteamAuth', 'Calling verifyAssertion');
    
    relyingParty.verifyAssertion(requestOrParams, (err: OpenIdError | null, result?: { authenticated: boolean; claimedIdentifier?: string; }) => {
      if (err) {
        logError('SteamAuth', 'Error verifying assertion', err);
        return reject(new Error(err.message));
      }
      if (!result || !result.authenticated || !result.claimedIdentifier) {
        logError('SteamAuth', 'Invalid verification result', {
          has_result: !!result,
          authenticated: result?.authenticated,
          has_claimedIdentifier: !!result?.claimedIdentifier
        });
        return reject(new Error('Failed to verify assertion.'));
      }
      
      const steamId = result.claimedIdentifier.split('/').pop() || '';
      logDebug('SteamAuth', 'Successfully verified Steam ID', {
        steamId: steamId,
        claimedIdentifier: result.claimedIdentifier
      });
      resolve(steamId);
    });
  });
};

export const getUserInfo = async (steamId: string): Promise<SteamUser> => {
  const apiKey = config.steamApiKey;
  if (!apiKey) {
    logError('SteamAuth', 'Steam API key not configured', {});
    throw new Error('Steam API key not configured.');
  }

  const apiUrl = `http://api.steampowered.com/ISteamUser/GetPlayerSummaries/v0002/?key=${apiKey}&steamids=${steamId}`;
  
  logDebug('SteamAuth', 'Fetching Steam user info', {
    steamId: steamId,
    api_key: sanitize(apiKey, 'key'),
    url: apiUrl.replace(apiKey, sanitize(apiKey, 'key'))
  });

  try {
    const response = await axios.get(apiUrl);
    
    logDebug('SteamAuth', 'Steam API response received', {
      status: response.status,
      has_players: !!response.data?.response?.players,
      player_count: response.data?.response?.players?.length || 0
    });

    const player = response.data.response.players[0];
    if (!player) {
      logError('SteamAuth', 'User not found in Steam API response', { steamId });
      throw new Error('User not found.');
    }

    logDebug('SteamAuth', 'User info retrieved', {
      steamId: player.steamid,
      personaname: player.personaname,
      profileurl: player.profileurl
    });

    return player;
  } catch (error) {
    if (axios.isAxiosError(error)) {
      logError('SteamAuth', 'Steam API request failed', {
        status: error.response?.status,
        statusText: error.response?.statusText,
        data: error.response?.data
      });
    } else {
      logError('SteamAuth', 'Unexpected error fetching user info', error);
    }
    throw error;
  }
};
