# Steam Auth Proxy Design

## Overview

The Steam Auth Proxy is a production-grade TypeScript Node.js application that implements a fully OpenID Connect compliant authentication provider, translating Steam's legacy OpenID 2.0 authentication into modern OIDC flows. The application provides standard OIDC endpoints that any identity provider can consume, making Steam authentication as simple as configuring any other OIDC provider.

### Objectives
1. Implement a fully OIDC-compliant authentication provider
2. Translate Steam OpenID 2.0 to standard OIDC flows
3. Provide discovery, authorization, token, and userinfo endpoints
4. Enable immediate integration with IDPs like Keycloak, Ory, and Auth0
5. Include a test client to verify OIDC compliance

## Architecture

### High-Level Architecture
```
┌─────────────────┐     ┌──────────────────┐     ┌─────────────────┐
│  OIDC Client    │     │  Steam Auth      │     │  Steam OpenID   │
│  (IDP/Test)     │────▶│  Proxy (OIDC)    │────▶│  2.0 Provider   │
│                 │◀────│                  │◀────│                 │
└─────────────────┘     └──────────────────┘     └─────────────────┘
        │                        │                         │
        │                        │                         │
        ▼                        ▼                         ▼
   OIDC Protocol          TypeScript/Express        Steam Protocol
   (JWT, OAuth2)          OIDC Provider             (OpenID 2.0)
```

### Component Flow
1. OIDC client discovers configuration via /.well-known/openid-configuration
2. Client initiates authorization request to /authorize endpoint
3. Proxy redirects user to Steam for authentication
4. User authenticates on Steam's website
5. Steam redirects back with OpenID 2.0 assertion
6. Proxy validates assertion and generates authorization code
7. Client exchanges code for tokens at /token endpoint
8. Client retrieves user info from /userinfo endpoint using access token

## Components and Interfaces

### Backend Components

#### 1. Express Server (`src/server.ts`)
- **Purpose**: Main application server
- **Responsibilities**:
  - Serve static files
  - Handle HTTP routes
  - Manage middleware
- **Key Dependencies**:
  - express
  - express-session
  - dotenv
  - jose (for JWT operations)
  - @types/express
  - @types/express-session
  - @types/node
  - typescript
  - ts-node

#### 2. Steam Auth Service (`src/services/steamAuth.ts`)
- **Purpose**: Handle Steam OpenID 2.0 authentication
- **Responsibilities**:
  - Generate authentication URLs
  - Validate authentication responses
  - Fetch user profile data from Steam API
- **Key Methods**:
  - `getAuthUrl(returnUrl: string): string`: Generate Steam authentication URL
  - `verifyAssertion(params: OpenIDParams): Promise<string>`: Validate OpenID assertion
  - `getUserInfo(steamId: string): Promise<SteamUser>`: Fetch user profile from Steam API

#### 3. OIDC Provider Service (`src/services/oidcProvider.ts`)
- **Purpose**: Implement OIDC provider functionality
- **Responsibilities**:
  - Generate and validate JWT tokens
  - Manage authorization codes
  - Handle OIDC flows and validations
- **Key Methods**:
  - `generateIdToken(user: SteamUser, client: OIDCClient, nonce?: string): string`
  - `generateAuthCode(steamId: string, clientId: string, redirectUri: string): string`
  - `validateAuthCode(code: string, clientId: string): AuthCodeData | null`
  - `generateAccessToken(steamId: string): string`

#### 4. OIDC Routes (`src/routes/oidc.ts`)
- **Purpose**: Implement OIDC endpoints
- **Endpoints**:
  - `GET /.well-known/openid-configuration`: Discovery endpoint
  - `GET /authorize`: Authorization endpoint
  - `POST /token`: Token endpoint
  - `GET /userinfo`: UserInfo endpoint
  - `GET /.well-known/jwks.json`: JSON Web Key Set endpoint

#### 5. Crypto Service (`src/services/crypto.ts`)
- **Purpose**: Handle cryptographic operations using Node.js built-in crypto module
- **Responsibilities**:
  - Generate RSA key pairs for JWT signing
  - Generate secure random codes for authorization codes
  - Create code challenges for PKCE
- **Key Methods**:
  - `generateKeyPair(): KeyPair` - Uses crypto.generateKeyPairSync()
  - `generateSecureCode(): string` - Uses crypto.randomBytes()
  - `generateCodeChallenge(verifier: string): string` - PKCE support
- **Note**: JWT signing/verification is handled by the jose library in oidcProvider.ts

### Test Client Components

#### 1. Test Client (`public/test-client.html`)
- **Purpose**: OIDC test client for verification
- **Features**:
  - OIDC discovery test
  - Authorization flow test
  - Token validation display
  - UserInfo endpoint test

#### 2. Client JavaScript (`public/js/test-client.js`)
- **Purpose**: Implement OIDC client logic
- **Responsibilities**:
  - Perform OIDC discovery
  - Handle authorization flow
  - Exchange code for tokens
  - Display results

## Data Models

### OIDC Client Configuration
```typescript
interface OIDCClient {
  client_id: string;
  client_secret: string;
  redirect_uris: string[];
  grant_types: string[];
  response_types: string[];
  scope: string;
}
```

### Authorization Code
```typescript
interface AuthCodeData {
  code: string;
  clientId: string;
  redirectUri: string;
  steamId: string;
  nonce?: string;
  createdAt: number;
  expiresAt: number;
}
```

### ID Token Claims
```typescript
interface IDTokenClaims {
  iss: string;              // Issuer (this proxy)
  sub: string;              // Subject (Steam ID)
  aud: string;              // Audience (client_id)
  exp: number;              // Expiration time
  iat: number;              // Issued at
  nonce?: string;           // Nonce from auth request
  name: string;             // Steam display name
  picture: string;          // Steam avatar URL
  profile: string;          // Steam profile URL
}
```

### Access Token Data
```typescript
interface AccessTokenData {
  token: string;
  steamId: string;
  clientId: string;
  scope: string;
  createdAt: number;
  expiresAt: number;
}
```

### OIDC Discovery Document
```typescript
interface OIDCDiscoveryDocument {
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
```

### Steam OpenID Response
```typescript
interface OpenIDParams {
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
```

### Steam API User Response
```typescript
interface SteamUser {
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
```

## Implementation Details

### OIDC Authorization Code Flow
1. **Authorization Request** (`/authorize`):
   - Validate client_id, redirect_uri, response_type, scope
   - Store state and nonce for CSRF/replay protection
   - Redirect to Steam OpenID 2.0 for authentication

2. **Steam Callback Handling**:
   - Validate Steam OpenID 2.0 assertion
   - Extract Steam ID from claimed_id
   - Generate authorization code
   - Redirect back to client with code

3. **Token Exchange** (`/token`):
   - Validate authorization code
   - Verify client credentials
   - Generate ID token with JWT
   - Generate access token
   - Return token response

4. **UserInfo Request** (`/userinfo`):
   - Validate access token
   - Fetch Steam user data if needed
   - Return user claims as JSON

### JWT Token Management
- Generate RSA key pair on startup using Node.js crypto module
- Sign ID tokens with RS256 algorithm using jose library
- Use jose's SignJWT class for token creation with proper OIDC claims
- Token expiration: 1 hour for ID tokens
- Access tokens stored in memory with mapping to user data (Redis recommended for production)
- Public keys exposed via JWKS endpoint using jose's exportJWK()

### Authorization Code Management
- Generate cryptographically secure codes
- Store codes in memory with metadata (Redis recommended for production)
- Code expiration: 10 minutes
- Single-use enforcement
- Associate with client_id and redirect_uri

### Environment Configuration
```env
# Server Configuration
PORT=3000
BASE_URL=http://localhost:3000

# Steam Configuration
STEAM_API_KEY=your_steam_api_key_here
STEAM_REALM=http://localhost:3000
STEAM_RETURN_URL=http://localhost:3000/auth/steam/return

# OIDC Configuration
OIDC_CLIENT_ID=steam-auth-proxy
OIDC_CLIENT_SECRET=your_client_secret_here
OIDC_ISSUER=http://localhost:3000

# Session Configuration (for internal use)
SESSION_SECRET=your_session_secret_here
SESSION_NAME=steam_auth_session
```

### TypeScript Configuration
```typescript
// tsconfig.json
{
  "compilerOptions": {
    "target": "ES2020",
    "module": "commonjs",
    "lib": ["ES2020"],
    "outDir": "./dist",
    "rootDir": "./src",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "resolveJsonModule": true,
    "moduleResolution": "node",
    "types": ["node", "express", "express-session"]
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist"]
}
```

## Error Handling

### OIDC Error Responses
- **invalid_request**: Missing or invalid parameters
- **unauthorized_client**: Client not authorized for request
- **invalid_client**: Client authentication failed
- **invalid_grant**: Authorization code invalid or expired
- **unsupported_response_type**: Response type not supported
- **invalid_scope**: Requested scope is invalid
- **server_error**: Unexpected server error

### Steam Integration Errors
- **Steam authentication failure**: Return error to client callback
- **Steam API unavailable**: Return server_error to client
- **Invalid Steam response**: Log and return server_error

## Testing Strategy

### OIDC Compliance Testing
1. Discovery endpoint returns valid configuration
2. Authorization endpoint validates all parameters
3. Successful Steam auth generates valid authorization code
4. Token endpoint exchanges code for valid JWT tokens
5. ID token can be validated with JWKS endpoint
6. UserInfo endpoint returns correct claims
7. Error responses follow OIDC specification

### Integration Testing
1. Configure as OIDC provider in Keycloak
2. Complete full authentication flow
3. Verify token validation in IDP
4. Test with multiple redirect URIs
5. Verify PKCE support

### Key Test Scenarios
- **Happy path**: Complete OIDC flow with valid tokens
- **Invalid client**: Test with wrong client credentials
- **Invalid redirect**: Test with unregistered redirect URI
- **Expired code**: Test token exchange with expired code
- **Invalid scope**: Request unsupported scopes
- **PKCE flow**: Test with code challenge/verifier
- **Token validation**: Verify JWT signature and claims

## Security Considerations

### Security Measures
1. Steam API key only on server-side
2. Validate all redirect URLs against whitelist
3. Secure session cookies with httpOnly and secure flags
4. Comprehensive input sanitization
5. HTTPS required for production
6. PKCE support for enhanced security
7. JWT tokens signed with RS256
8. Secure random generation for codes

### Production Considerations
- Use Redis or similar for distributed session storage
- Implement rate limiting per client
- Structured error logging without sensitive data exposure
- CSRF protection on state parameter
- Comprehensive input validation on all endpoints

## Migration and Rollout

### Deployment Roadmap
1. **v1.0**: Core OIDC functionality (current)
2. **v1.1**: Docker deployment and documentation
3. **v2.0**: Multi-client support and token refresh
4. **v2.1**: Database persistence and horizontal scaling
5. **v3.0**: Dynamic client registration

### Extension Points
- Database for session/user storage
- Redis for distributed sessions
- Full OIDC implementation
- Admin interface for client management
- Comprehensive logging and monitoring