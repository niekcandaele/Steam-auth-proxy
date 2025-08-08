import dotenv from 'dotenv';
import logger from './utils/logger';
import { sanitize } from './utils/logging';

dotenv.config();

if (!process.env.BASE_URL) {
  logger.error('FATAL ERROR: BASE_URL is not defined. Please set it in your .env file.');
  process.exit(1);
}

const port = process.env.PORT || 19000;
const localHttps = process.env.LOCAL_HTTPS_ENABLED === 'true';

// Parse allowed redirect URIs from environment
// If not specified, default to BASE_URL for backward compatibility
const parseRedirectUris = (): string[] => {
  const allowedUris = process.env.ALLOWED_REDIRECT_URIS;
  if (allowedUris) {
    return allowedUris.split(',').map(uri => uri.trim()).filter(uri => uri.length > 0);
  }
  // Default to BASE_URL if ALLOWED_REDIRECT_URIS not specified
  return [process.env.BASE_URL as string];
};

export const config = {
  port,
  localHttps,
  baseUrl: process.env.BASE_URL as string,
  steamApiKey: process.env.STEAM_API_KEY,
  steamRealm: process.env.BASE_URL as string,
  steamReturnUrl: `${process.env.BASE_URL}/auth/steam/return`,
  oidcIssuer: process.env.BASE_URL as string,
  sessionSecret: process.env.SESSION_SECRET,
  sessionName: process.env.SESSION_NAME,
  allowedRedirectUris: parseRedirectUris(),
};

// Log configuration on startup
logger.info('Steam Auth Proxy Configuration', {
  port: config.port,
  httpsEnabled: config.localHttps,
  baseUrl: config.baseUrl,
  steamReturnUrl: config.steamReturnUrl,
  oidcIssuer: config.oidcIssuer,
  allowedRedirectUris: config.allowedRedirectUris,
  allowedRedirectUrisCount: config.allowedRedirectUris.length,
  steamApiKey: sanitize(config.steamApiKey, 'key'),
  sessionSecretConfigured: !!config.sessionSecret,
  sessionName: config.sessionName || 'steam_auth_session'
});
