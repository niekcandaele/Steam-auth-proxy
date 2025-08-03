# Implementation Tasks for Steam Auth Proxy

## Phase 1: Project Setup and Configuration

- [ ] Initialize TypeScript Node.js project with package.json
  - Requirement: REQ-005
  - Design ref: Section 2 (Architecture)
  - **Prompt**: "Initialize a Node.js project with package.json including name 'steam-auth-proxy', version '1.0.0', description, main entry point 'dist/server.js', and scripts for TypeScript compilation"

- [ ] Install core dependencies and TypeScript
  - Requirement: REQ-005
  - Design ref: Backend Components
  - **Prompt**: "Install production dependencies: express, express-session, dotenv, axios, openid, jose. Install dev dependencies: typescript, ts-node, @types/node, @types/express, @types/express-session, nodemon"

- [ ] Create project directory structure
  - Requirement: REQ-005
  - Design ref: Components and Interfaces
  - **Prompt**: "Create directory structure: src/ for TypeScript source code, src/routes/ for route handlers, src/services/ for business logic, src/types/ for type definitions, public/ for static files, public/js/ for client JavaScript, dist/ for compiled output"

- [ ] Create environment configuration file
  - Requirement: REQ-004, REQ-005
  - Design ref: Environment Configuration
  - **Prompt**: "Create .env.example file with all required environment variables: PORT, BASE_URL, STEAM_API_KEY, STEAM_REALM, STEAM_RETURN_URL, OIDC_CLIENT_ID, OIDC_CLIENT_SECRET, OIDC_ISSUER, SESSION_SECRET, SESSION_NAME"

- [ ] Create .gitignore file
  - Requirement: REQ-005
  - Design ref: Security Considerations
  - **Prompt**: "Create .gitignore file that excludes node_modules/, dist/, .env, .env.local, npm-debug.log, *.log, .DS_Store, and other common development files"

- [ ] Create TypeScript configuration
  - Requirement: REQ-005
  - Design ref: TypeScript Configuration
  - **Prompt**: "Create tsconfig.json with strict TypeScript settings: target ES2020, strict mode enabled, type checking for node and express types, output to dist/ directory"

- [ ] Create type definitions
  - Requirement: REQ-005
  - Design ref: Data Models
  - **Prompt**: "Create src/types/index.ts with TypeScript interfaces: OIDCClient, AuthCodeData, IDTokenClaims, AccessTokenData, OIDCDiscoveryDocument, OpenIDParams, and SteamUser based on the data models in the design document"

## Phase 2: OIDC Provider Implementation

- [ ] Implement Express server setup
  - Requirement: REQ-001, REQ-005
  - Design ref: Express Server component
  - **Prompt**: "Create src/server.ts with TypeScript Express server setup including: typed middleware for JSON parsing, static file serving from public/, session management with express-session and custom session types, environment variable loading with dotenv"

- [ ] Implement Steam authentication service
  - Requirement: REQ-001, REQ-004
  - Design ref: Steam Auth Service component
  - **Prompt**: "Create src/services/steamAuth.ts implementing Steam OpenID 2.0 authentication with typed methods: getAuthUrl(returnUrl: string): string, verifyAssertion(params: OpenIDParams): Promise<string>, getUserInfo(steamId: string): Promise<SteamUser>"

- [ ] Implement crypto service for key and code generation
  - Requirement: REQ-004, REQ-005
  - Design ref: Crypto Service component
  - **Prompt**: "Create src/services/crypto.ts using Node.js built-in crypto module with methods: generateKeyPair() for RSA key generation using crypto.generateKeyPairSync(), generateSecureCode() for authorization codes using crypto.randomBytes(), and generateCodeChallenge() for PKCE support"

- [ ] Implement OIDC provider service
  - Requirement: REQ-002, REQ-003
  - Design ref: OIDC Provider Service component
  - **Prompt**: "Create src/services/oidcProvider.ts using jose library for JWT operations. Use SignJWT and importJWK from jose to generate ID tokens with proper OIDC claims. Include methods for managing authorization codes, validating OIDC parameters, and generating access tokens"

- [ ] Implement error handling middleware
  - Requirement: REQ-001, REQ-005
  - Design ref: Error Handling section
  - **Prompt**: "Create error handling middleware in server.ts with proper TypeScript error types that catches errors, logs them appropriately, and returns user-friendly error messages without exposing sensitive information"

- [ ] Implement OIDC discovery endpoint
  - Requirement: REQ-003
  - Design ref: OIDC Routes component
  - **Prompt**: "Create src/routes/oidc.ts with GET /.well-known/openid-configuration endpoint that returns the OIDC discovery document with all supported endpoints, scopes, and capabilities"

- [ ] Implement authorization endpoint
  - Requirement: REQ-001, REQ-003
  - Design ref: OIDC Routes component
  - **Prompt**: "Add GET /authorize endpoint to src/routes/oidc.ts that validates OIDC parameters (client_id, redirect_uri, response_type, scope), stores state/nonce, and redirects to Steam for authentication"

- [ ] Implement token endpoint
  - Requirement: REQ-002, REQ-003
  - Design ref: OIDC Routes component
  - **Prompt**: "Add POST /token endpoint to src/routes/oidc.ts that validates authorization codes, verifies client credentials, and returns JWT ID tokens and access tokens according to OIDC spec"

- [ ] Implement userinfo endpoint
  - Requirement: REQ-002, REQ-003
  - Design ref: OIDC Routes component
  - **Prompt**: "Add GET /userinfo endpoint to src/routes/oidc.ts that validates access tokens and returns user claims (sub, name, picture, profile) based on requested scopes"

- [ ] Implement JWKS endpoint
  - Requirement: REQ-003, REQ-004
  - Design ref: OIDC Routes component
  - **Prompt**: "Add GET /.well-known/jwks.json endpoint to src/routes/oidc.ts that returns the public keys in JWK format. Use jose's exportJWK() to convert the RSA public key to JWK format with proper kid (key ID) and use properties"

- [ ] Implement Steam callback handler
  - Requirement: REQ-001
  - Design ref: OIDC Authorization Code Flow
  - **Prompt**: "Create src/routes/steam-callback.ts to handle Steam OpenID 2.0 return, validate assertion, generate authorization code, and redirect back to client with code"

## Phase 3: Test Client Implementation

- [ ] Create OIDC test client page
  - Requirement: REQ-005
  - Design ref: Test Client component
  - **Prompt**: "Create public/test-client.html with OIDC test interface featuring: discovery test button, authorization flow initiation, token display area, userinfo test, and results visualization"

- [ ] Implement OIDC client JavaScript
  - Requirement: REQ-005
  - Design ref: Client JavaScript component
  - **Prompt**: "Create public/js/test-client.js implementing: OIDC discovery fetch, authorization URL building with PKCE, authorization code flow handling, token exchange, JWT decoding and display, userinfo endpoint testing"

- [ ] Create client styling
  - Requirement: REQ-005
  - Design ref: Test Client Components
  - **Prompt**: "Create public/css/test-client.css with developer-friendly styling: monospace font for tokens, syntax highlighting for JSON, collapsible sections, clear test status indicators"

- [ ] Add PKCE support to test client
  - Requirement: REQ-004
  - Design ref: Security Requirements
  - **Prompt**: "Enhance test client with PKCE implementation: generate code verifier and challenge, include in authorization request, send verifier in token exchange"

## Phase 4: Integration and Testing

- [ ] Implement in-memory storage for OIDC data
  - Requirement: REQ-003
  - Design ref: Authorization Code Management
  - **Prompt**: "Create src/services/storage.ts with in-memory stores for: authorization codes with expiration, access tokens with user mapping, client configurations, nonce tracking"

- [ ] Add OIDC parameter validation
  - Requirement: REQ-004
  - Design ref: Security Requirements
  - **Prompt**: "Add OIDC-specific validations: validate redirect URIs against registered values, check required parameters in authorization requests, validate grant_type in token requests, enforce HTTPS in production for all endpoints"

- [ ] Create Docker configuration
  - Requirement: REQ-005
  - Design ref: Development Requirements
  - **Prompt**: "Create Dockerfile for TypeScript Node.js application with: multi-stage build (TypeScript compilation stage and runtime stage), proper working directory setup, non-root user for security, exposed port configuration. Also create docker-compose.yml for easy local development"

- [ ] Write OIDC integration documentation
  - Requirement: REQ-005
  - Design ref: Overview section
  - **Prompt**: "Create INTEGRATION.md with: OIDC endpoints documentation, example configurations for Keycloak/Ory/Auth0, test client usage guide, JWT token structure explanation, troubleshooting OIDC flows, curl examples for each endpoint"

- [ ] Implement OIDC-focused logging
  - Requirement: REQ-005
  - Design ref: Development Requirements
  - **Prompt**: "Add logging for OIDC flows: authorization requests with parameters, token generation events, validation failures with reasons, Steam authentication outcomes, access token usage, using structured logging for easier debugging"

## Phase 5: Polish and Finalization

- [ ] Configure CORS for OIDC endpoints
  - Requirement: REQ-003, REQ-004
  - Design ref: OIDC Endpoints
  - **Prompt**: "Configure CORS headers for OIDC endpoints to allow cross-origin requests from IDPs: allow specific origins, handle preflight requests, set appropriate headers for token and userinfo endpoints"

- [ ] Implement OIDC error responses
  - Requirement: REQ-003
  - Design ref: OIDC Error Responses
  - **Prompt**: "Implement proper OIDC error responses: return errors as query parameters for authorization endpoint, return JSON errors for token endpoint, use standard error codes (invalid_request, invalid_client, etc.), include error_description when helpful"

- [ ] Add JWT expiration handling
  - Requirement: REQ-002, REQ-004
  - Design ref: JWT Token Management
  - **Prompt**: "Implement proper token expiration: set 1-hour expiration for ID tokens, implement token cleanup for expired access tokens, validate token expiration in userinfo endpoint, return appropriate errors for expired tokens"

- [ ] Implement graceful shutdown
  - Requirement: REQ-005
  - Design ref: Express Server component
  - **Prompt**: "Add graceful shutdown handling in server.ts: listen for SIGTERM/SIGINT signals with proper TypeScript process event types, close server connections properly, log shutdown events, exit with appropriate code"

- [ ] Create npm scripts
  - Requirement: REQ-005
  - Design ref: Development Requirements
  - **Prompt**: "Update package.json with TypeScript scripts: 'build' for tsc compilation, 'start' for production (node dist/server.js), 'dev' for development with nodemon and ts-node, 'type-check' for TypeScript validation, 'test' placeholder for future tests, 'docker:build' and 'docker:run' for container operations"

## Success Validation Checklist

After completing all tasks, verify:
- [ ] TypeScript compiles without errors (npm run type-check)
- [ ] OIDC discovery endpoint returns valid configuration at /.well-known/openid-configuration
- [ ] Test client can complete full OIDC authorization code flow
- [ ] ID tokens are valid JWTs that can be verified with JWKS endpoint
- [ ] UserInfo endpoint returns correct Steam profile data as OIDC claims
- [ ] Authorization endpoint properly validates all OIDC parameters
- [ ] Token endpoint correctly exchanges codes for tokens
- [ ] Error responses follow OIDC specification format
- [ ] Can configure proxy as OIDC provider in Keycloak (manual test)
- [ ] PKCE flow works correctly with code challenge/verifier
- [ ] All endpoints require HTTPS in production mode
- [ ] No sensitive information (API keys, client secrets) exposed to client
- [ ] All TypeScript types are properly defined (no 'any' types in production code)