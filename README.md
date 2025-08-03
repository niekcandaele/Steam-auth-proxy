# Steam Auth Proxy

**Seamless Steam SSO integration for modern identity providers**

Steam's authentication is stuck in 2010. While the rest of the world has moved to OAuth 2.0 and OpenID Connect, Steam still uses the legacy OpenID 2.0 protocol. This makes it impossible to add Steam as a "generic provider" in modern identity platforms like Keycloak, Ory, Auth0, or Okta.

**Steam Auth Proxy bridges that gap.**

## The Problem

You want to add "Login with Steam" to your application. Your identity provider has great support for OAuth and OIDC providers. But when you try to configure Steam:

- ❌ Steam uses OpenID 2.0 (deprecated since 2014)
- ❌ Returns XML instead of JSON
- ❌ No `.well-known/openid-configuration` endpoint
- ❌ Incompatible with every modern auth library
- ❌ Generic OIDC provider configs just don't work

## The Solution

Steam Auth Proxy acts as a translator between Steam's legacy OpenID 2.0 and modern OpenID Connect. Point your IDP to this proxy, and it handles all the complexity.

```
Your App → Your IDP → Steam Auth Proxy → Steam OpenID 2.0
                ↑                    ↓
                ←── Standard OIDC ───←
```

## Features

- 🔄 **Full OpenID Connect compliance** - Works with any OIDC-compatible identity provider
- 🚀 **Zero dependencies on Valve partnership** - No need for special Steam API access
- 🔒 **Secure by default** - Handles Steam API keys server-side
- 📦 **Docker ready** - Deploy in minutes
- 🎯 **Standard OIDC endpoints** - Discovery, authorization, token, and userinfo
- 👤 **Rich user profiles** - Returns Steam ID, display name, avatar, and profile URL

## Quick Start

### 1. Get your Steam API Key

Visit https://steamcommunity.com/dev/apikey to get your API key.

### 2. Run with Docker

```bash
docker run -d \
  -e STEAM_API_KEY=your_steam_api_key \
  -e BASE_URL=https://your-proxy-host.com \
  -e OIDC_CLIENT_ID=your_client_id \
  -e OIDC_CLIENT_SECRET=your_client_secret \
  -p 19000:19000 \
  ghcr.io/niekcandaele/steam-auth-proxy:latest
```

### 3. Configure your IDP

Add a new OpenID Connect provider with these endpoints:

- **Discovery URL**: `https://your-proxy-host.com/.well-known/openid-configuration`
- **Client ID**: The OIDC_CLIENT_ID you set above
- **Client Secret**: The OIDC_CLIENT_SECRET you set above

That's it! Your users can now login with Steam.

## Configuration

### Environment Variables

| Variable | Description | Required |
|----------|-------------|----------|
| `BASE_URL` | The public-facing URL of your proxy (e.g., `https://devbox:19000`). This is critical for Steam to communicate with the proxy. | ✅ |
| `STEAM_API_KEY` | Your Steam Web API key. | ✅ |
| `OIDC_CLIENT_ID` | The client ID for your OIDC application. | ✅ |
| `OIDC_CLIENT_SECRET` | The client secret for your OIDC application. | ✅ |
| `PORT` | Port to run the proxy on. | ❌ (default: 19000) |
| `LOCAL_HTTPS_ENABLED` | Enable self-signed HTTPS for local development. | ❌ (default: false) |

### Using with Popular IDPs

<details>
<summary><b>Keycloak</b></summary>

1. In Keycloak admin, go to Identity Providers
2. Add provider → OpenID Connect v1.0
3. Set Discovery URL to your proxy's `/.well-known/openid-configuration`
4. Enter your OIDC_CLIENT_ID and OIDC_CLIENT_SECRET
5. Save and test

</details>

<details>
<summary><b>Ory</b></summary>

1. In Ory Console, go to Social Sign In
2. Add Generic OpenID Connect Provider
3. Set Issuer URL to your proxy's `BASE_URL`
4. Configure client credentials
5. Map claims as needed

</details>

<details>
<summary><b>Auth0</b></summary>

1. Create a new Social Connection
2. Select "Custom OAuth2 Connection"
3. Configure with your proxy's endpoints
4. Set proper scopes: `openid profile`
5. Test the connection

</details>

## How It Works

1. **User clicks "Login with Steam"** in your application
2. **Your IDP redirects to Steam Auth Proxy** using standard OIDC flow
3. **Proxy translates the request** to Steam's OpenID 2.0 format
4. **User authenticates on Steam** using their existing Steam account
5. **Steam returns to proxy** with authentication assertion
6. **Proxy validates with Steam API** and fetches user profile
7. **Proxy returns standard OIDC tokens** to your IDP
8. **Your IDP handles the rest** as with any other OIDC provider

## Security Considerations

- **Never expose your Steam API key** - The proxy keeps it server-side
- **Use HTTPS in production** - Put the proxy behind a reverse proxy with TLS
- **Validate redirect URIs** - The proxy only allows pre-configured callbacks
- **Rotate secrets regularly** - Update OIDC_CLIENT_SECRET periodically
- **Monitor for abuse** - Steam API has rate limits

## API Endpoints

The proxy implements standard OpenID Connect endpoints:

- `GET /.well-known/openid-configuration` - OIDC discovery document
- `GET /authorize` - Authorization endpoint
- `POST /token` - Token endpoint
- `GET /userinfo` - User information endpoint

## Development

### Running Locally

```bash
# Clone the repository
git clone https://github.com/yourusername/steam-auth-proxy
cd steam-auth-proxy

# Install dependencies
npm install

# Set environment variables
cp .env.example .env
# Edit .env with your configuration, making sure to set BASE_URL

# Run in development (HTTP)
npm run dev

# Run in development (HTTPS)
# Set LOCAL_HTTPS_ENABLED=true in your .env file
npm run dev
```

### Building

```bash
# Build the application
npm run build

# Build Docker image
docker build -t steam-auth-proxy .
```

## Troubleshooting

### "Invalid discovery document" error
Your IDP might be caching the discovery document. Clear the cache or wait for it to expire.

### "Authentication failed" errors
Check that your STEAM_API_KEY is valid and not rate-limited.

### "No providers found for the given identifier" error
This means Steam rejected the authentication request. Ensure that your `BASE_URL` is set correctly in your `.env` file and is a publicly accessible address that Steam's servers can reach. For local development, this means using a service like ngrok or a similar tunneling tool to expose your local server to the internet.

### User profile missing data
Steam only provides limited data through OpenID. The proxy returns all available information.

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

MIT License - see LICENSE file for details

## Acknowledgments

- Inspired by the frustration of integrating Steam with modern auth systems
- Thanks to the developers who've documented Steam's quirks over the years
- Built for the community that just wants Steam SSO to work

---

**Not affiliated with Valve Corporation or Steam.**

