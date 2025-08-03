# Steam Auth Proxy Requirements

## Introduction

The Steam Auth Proxy is a production-grade OpenID Connect compliant authentication provider that bridges Steam's legacy OpenID 2.0 authentication with modern OIDC standards. This implementation provides a complete OIDC provider that can be immediately integrated with identity platforms like Keycloak, Ory, Auth0, and others.

The application implements all core OIDC endpoints (authorization, token, userinfo, and discovery) while handling the Steam OpenID 2.0 translation behind the scenes. This allows any OIDC-compatible identity provider to add Steam as an authentication option without dealing with Steam's legacy protocol.

## User Stories

### US-001: Steam Authentication
**As a** user  
**I want** to login using my Steam account  
**So that** I can access the application with my existing Steam credentials without creating a new account

### US-002: Profile Information Display
**As a** logged-in user  
**I want** to see my Steam profile information  
**So that** I can verify my authentication was successful and the proxy retrieved my data correctly

### US-003: OIDC Provider Integration
**As a** developer  
**I want** standard OIDC endpoints  
**So that** I can integrate Steam authentication into any OIDC-compatible identity provider

### US-004: OIDC Discovery
**As a** identity provider  
**I want** automatic OIDC discovery  
**So that** I can configure Steam authentication with just the discovery URL

### US-005: Test Client
**As a** developer  
**I want** a simple test client  
**So that** I can verify the OIDC implementation works correctly without external IDPs

## Acceptance Criteria

### Authentication Flow (REQ-001)
- The system SHALL display a "Login with Steam" button on the homepage
- WHEN the user clicks the login button, the system SHALL redirect to Steam's authentication page
- The system SHALL handle the Steam OpenID 2.0 authentication response
- IF authentication is successful, THEN the system SHALL create a user session
- IF authentication fails, THEN the system SHALL display an error message
- The system SHALL NOT expose the Steam API key to the client

### OIDC Token Requirements (REQ-002)
- The system SHALL issue JWT ID tokens containing standard OIDC claims
- ID tokens SHALL include at minimum: iss, sub, aud, exp, iat, nonce
- The system SHALL map Steam profile data to standard OIDC claims:
  - sub: Steam ID (64-bit)
  - name: Steam display name
  - picture: Steam avatar URL
  - profile: Steam profile URL
- Access tokens SHALL be opaque strings mapped to user sessions
- The system SHALL support the openid and profile scopes

### OIDC Endpoints (REQ-003)
- The system SHALL implement a discovery endpoint at /.well-known/openid-configuration
- The system SHALL implement an authorization endpoint supporting the authorization code flow
- The system SHALL implement a token endpoint that returns JWT tokens
- The system SHALL implement a userinfo endpoint that returns user claims
- The system SHALL implement a JWKS endpoint for public key distribution
- All endpoints SHALL conform to OpenID Connect Core 1.0 specification

### Security Requirements (REQ-004)
- The system SHALL validate all redirect URIs against pre-registered values
- The system SHALL use HTTPS for all endpoints in production
- The system SHALL sign all JWT tokens with RS256 algorithm
- The system SHALL validate all OIDC parameters according to specification
- The system SHALL implement PKCE (Proof Key for Code Exchange) support
- The system SHALL NOT log sensitive authentication tokens or codes
- The Steam API key SHALL only be accessible server-side

### Development Requirements (REQ-005)
- The system SHALL be implemented in TypeScript for type safety
- The system SHALL run on Node.js with TypeScript compilation
- The system SHALL use environment variables for configuration
- The system SHALL provide clear error messages for debugging
- The system SHALL include a Docker configuration for easy deployment
- The system SHALL log all authentication attempts for troubleshooting
- The system SHALL include proper type definitions for all data structures
- The system SHALL use strict TypeScript compiler settings
- The system SHALL generate cryptographically secure keys for JWT signing

## Out of Scope for Initial Release

The following features are planned for future releases:
- Token refresh mechanisms (v2.0)
- Multiple client support (v2.0)
- Advanced user profile data (game library, friends list)
- Database persistence for scalability (v2.0)
- Advanced rate limiting (basic rate limiting included)
- Comprehensive metrics and monitoring (v2.0)
- Dynamic client registration (v3.0)
- Token introspection endpoint (v2.0)
- Token revocation endpoint (v2.0)

## Success Criteria

The application is considered production-ready when:
1. An OIDC client can discover the provider configuration via /.well-known/openid-configuration
2. An OIDC client can complete the authorization code flow with Steam authentication
3. The proxy returns valid JWT tokens that can be verified with the JWKS endpoint
4. The userinfo endpoint returns accurate Steam profile data as OIDC claims
5. The implementation can be configured as an OIDC provider in Keycloak or similar IDPs
6. All OIDC endpoints pass basic compliance tests