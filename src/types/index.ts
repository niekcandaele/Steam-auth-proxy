export interface OIDCClient {
  client_id: string;
  client_secret: string;
  redirect_uris: string[];
  grant_types: string[];
  response_types: string[];
  scope: string;
}

export interface AuthCodeData {
  code: string;
  clientId: string;
  redirectUri: string;
  steamId: string;
  nonce?: string;
  createdAt: number;
  expiresAt: number;
}

export interface IDTokenClaims {
  iss: string;
  sub: string;
  aud: string;
  exp: number;
  iat: number;
  nonce?: string;
  name: string;
  picture: string;
  profile: string;
}

export interface AccessTokenData {
  token: string;
  steamId: string;
  clientId: string;
  scope: string;
  createdAt: number;
  expiresAt: number;
}

export interface OIDCDiscoveryDocument {
  issuer: string;
  authorization_endpoint: string;
  token_endpoint: string;
  userinfo_endpoint: string;
  jwks_uri: string;
  response_types_supported: string[];
  subject_types_supported: string[];
  id_token_signing_alg_values_supported: string[];
  scopes_supported: string[];
  token_endpoint_auth_methods_supported: string[];
  claims_supported: string[];
  grant_types_supported: string[];
}

export interface OpenIDParams {
  "openid.ns": string;
  "openid.mode": string;
  "openid.op_endpoint": string;
  "openid.claimed_id": string;
  "openid.identity": string;
  "openid.return_to": string;
  "openid.response_nonce": string;
  "openid.assoc_handle": string;
  "openid.signed": string;
  "openid.sig": string;
}

export interface SteamUser {
  steamid: string;
  communityvisibilitystate: number;
  profilestate: number;
  personaname: string;
  profileurl: string;
  avatar: string;
  avatarmedium: string;
  avatarfull: string;
  lastlogoff: number;
  personastate: number;
  primaryclanid?: string;
  timecreated?: number;
  personastateflags?: number;
}