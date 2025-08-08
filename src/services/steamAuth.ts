import { OpenIDParams, SteamUser } from '../types';
import axios from 'axios';
import openid, { OpenIdError } from 'openid';
import { config } from '../config';
import { Request } from 'express';
import { sanitize } from '../utils/logging';
import logger from '../utils/logger';

const STEAM_OPENID_URL = 'https://steamcommunity.com/openid';

export const getAuthUrl = async (returnUrl: string): Promise<string> => {
  logger.debug('getAuthUrl called', { 
    context: 'SteamAuth',
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

  logger.debug('RelyingParty created', {
    context: 'SteamAuth',
    stateless: true,
    strict: true
  });

  return new Promise((resolve, reject) => {
    relyingParty.authenticate(STEAM_OPENID_URL, false, (err: OpenIdError | null, authUrl?: string | null) => {
      if (err) {
        logger.error('Error from openid.authenticate', {
          context: 'SteamAuth',
          error: err.message
        });
        return reject(new Error(err.message));
      }
      if (!authUrl) {
        logger.error('Authentication URL not generated', { context: 'SteamAuth' });
        return reject(new Error('Authentication URL not generated.'));
      }
      logger.debug('Auth URL generated successfully', {
        context: 'SteamAuth',
        urlLength: authUrl.length,
        hasOpenidParams: authUrl.includes('openid')
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
  
  logger.debug('verifyAssertion called', {
    context: 'SteamAuth',
    returnUrl: returnUrl,
    isRequest: 'method' in requestOrParams,
    hasClaimedId: 'method' in requestOrParams 
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
    logger.debug('Calling verifyAssertion', { context: 'SteamAuth' });
    
    relyingParty.verifyAssertion(requestOrParams, (err: OpenIdError | null, result?: { authenticated: boolean; claimedIdentifier?: string; }) => {
      if (err) {
        logger.error('Error verifying assertion', {
          context: 'SteamAuth',
          error: err.message
        });
        return reject(new Error(err.message));
      }
      if (!result || !result.authenticated || !result.claimedIdentifier) {
        logger.error('Invalid verification result', {
          context: 'SteamAuth',
          hasResult: !!result,
          authenticated: result?.authenticated,
          hasClaimedIdentifier: !!result?.claimedIdentifier
        });
        return reject(new Error('Failed to verify assertion.'));
      }
      
      const steamId = result.claimedIdentifier.split('/').pop() || '';
      logger.debug('Successfully verified Steam ID', {
        context: 'SteamAuth',
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
    logger.error('Steam API key not configured', { context: 'SteamAuth' });
    throw new Error('Steam API key not configured.');
  }

  const apiUrl = `http://api.steampowered.com/ISteamUser/GetPlayerSummaries/v0002/?key=${apiKey}&steamids=${steamId}`;
  
  logger.debug('Fetching Steam user info', {
    context: 'SteamAuth',
    steamId: steamId,
    apiKey: sanitize(apiKey, 'key'),
    url: apiUrl.replace(apiKey, sanitize(apiKey, 'key'))
  });

  try {
    const response = await axios.get(apiUrl);
    
    logger.debug('Steam API response received', {
      context: 'SteamAuth',
      status: response.status,
      hasPlayers: !!response.data?.response?.players,
      playerCount: response.data?.response?.players?.length || 0
    });

    const player = response.data.response.players[0];
    if (!player) {
      logger.error('User not found in Steam API response', { 
        context: 'SteamAuth',
        steamId 
      });
      throw new Error('User not found.');
    }

    logger.debug('User info retrieved', {
      context: 'SteamAuth',
      steamId: player.steamid,
      personaname: player.personaname,
      profileurl: player.profileurl
    });

    return player;
  } catch (error) {
    if (axios.isAxiosError(error)) {
      logger.error('Steam API request failed', {
        context: 'SteamAuth',
        status: error.response?.status,
        statusText: error.response?.statusText,
        data: error.response?.data
      });
    } else {
      logger.error('Unexpected error fetching user info', {
        context: 'SteamAuth',
        error: error instanceof Error ? error.message : error
      });
    }
    throw error;
  }
};
