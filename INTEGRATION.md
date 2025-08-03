# OIDC Integration Guide

This document provides instructions on how to integrate the Steam Auth Proxy with your OIDC-compliant identity provider.

## Endpoints

- **Discovery:** `/.well-known/openid-configuration`
- **Authorization:** `/authorize`
- **Token:** `/token`
- **UserInfo:** `/userinfo`
- **JWKS:** `/.well-known/jwks.json`

## Example Configuration (Keycloak)

1.  Go to `Identity Providers` and select `OpenID Connect v1.0`.
2.  Set a display name and alias.
3.  Set `Authorization URL` to `http://localhost:3000/authorize`.
4.  Set `Token URL` to `http://localhost:3000/token`.
5.  Set `User Info URL` to `http://localhost:3000/userinfo`.
6.  Set `Client ID` and `Client Secret` to the values in your `.env` file.
7.  Save the configuration.

## JWT Token Structure

The ID token is a standard JWT with the following claims:

- `iss`: The issuer of the token (this proxy).
- `sub`: The user's Steam ID.
- `aud`: The client ID.
- `exp`: The token's expiration time.
- `iat`: The time the token was issued.
- `name`: The user's Steam display name.
- `picture`: The user's Steam avatar URL.
- `profile`: The user's Steam profile URL.
