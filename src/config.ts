import dotenv from 'dotenv';
dotenv.config();

if (!process.env.BASE_URL) {
  console.error('FATAL ERROR: BASE_URL is not defined. Please set it in your .env file.');
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

// Log configuration on startup (sanitized)
const sanitize = (value: string | undefined, label: string = 'value'): string => {
  if (!value) return '[not set]';
  if (value.length <= 10) return `${label}[***]`;
  return `${value.substring(0, 4)}****${value.substring(value.length - 4)}`;
};

console.log('=== Steam Auth Proxy Configuration ===');
console.log(`Port: ${config.port}`);
console.log(`HTTPS Enabled: ${config.localHttps}`);
console.log(`Base URL: ${config.baseUrl}`);
console.log(`Steam Return URL: ${config.steamReturnUrl}`);
console.log(`OIDC Issuer: ${config.oidcIssuer}`);
console.log(`Allowed Redirect URIs: ${config.allowedRedirectUris.length} configured`);
config.allowedRedirectUris.forEach((uri, index) => {
  console.log(`  [${index + 1}] ${uri}`);
});
console.log(`Steam API Key: ${sanitize(config.steamApiKey, 'key')}`);
console.log(`Session Secret: ${config.sessionSecret ? '[CONFIGURED]' : '[NOT SET]'}`);
console.log(`Session Name: ${config.sessionName || 'steam_auth_session'}`);
console.log('=====================================');
