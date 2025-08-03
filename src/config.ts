import dotenv from 'dotenv';
dotenv.config();

if (!process.env.BASE_URL) {
  console.error('FATAL ERROR: BASE_URL is not defined. Please set it in your .env file.');
  process.exit(1);
}

const port = process.env.PORT || 19000;
const localHttps = process.env.LOCAL_HTTPS_ENABLED === 'true';

export const config = {
  port,
  localHttps,
  baseUrl: process.env.BASE_URL as string,
  steamApiKey: process.env.STEAM_API_KEY,
  steamRealm: process.env.BASE_URL as string,
  steamReturnUrl: `${process.env.BASE_URL}/auth/steam/return`,
  oidcClientId: process.env.OIDC_CLIENT_ID,
  oidcClientSecret: process.env.OIDC_CLIENT_SECRET,
  oidcIssuer: process.env.BASE_URL as string,
  sessionSecret: process.env.SESSION_SECRET,
  sessionName: process.env.SESSION_NAME,
};
