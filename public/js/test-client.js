document.addEventListener('DOMContentLoaded', () => {
  const discoverBtn = document.getElementById('discover-btn');
  const authBtn = document.getElementById('auth-btn');
  const resultsEl = document.getElementById('results');

  let oidcConfig;

  const displayResults = (data) => {
    resultsEl.textContent = JSON.stringify(data, null, 2);
  };

  const generateRandomString = (length) => {
    const array = new Uint32Array(length / 2);
    window.crypto.getRandomValues(array);
    return Array.from(array, dec => ('0' + dec.toString(16)).substr(-2)).join('');
  };

  const sha256 = async (plain) => {
    const encoder = new TextEncoder();
    const data = encoder.encode(plain);
    return window.crypto.subtle.digest('SHA-256', data);
  };

  const base64urlencode = (a) => {
    return btoa(String.fromCharCode.apply(null, new Uint8Array(a)))
      .replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  };

  const discover = async () => {
    try {
      const response = await fetch('/.well-known/openid-configuration');
      oidcConfig = await response.json();
      displayResults(oidcConfig);
    } catch (error) {
      displayResults({ error: error.message });
    }
  };

  discoverBtn.addEventListener('click', discover);

  authBtn.addEventListener('click', async () => {
    if (!oidcConfig) {
      await discover();
    }

    // Store client secret for later use
    const clientSecret = document.getElementById('client-secret').value;
    if (!clientSecret) {
      displayResults({ error: 'Please enter a client secret' });
      return;
    }
    sessionStorage.setItem('client_secret', clientSecret);

    const code_verifier = generateRandomString(64);
    sessionStorage.setItem('code_verifier', code_verifier);
    const code_challenge = base64urlencode(await sha256(code_verifier));

    const clientId = 'steam-auth-client';
    const redirectUri = oidcConfig.issuer;
    const responseType = 'code';
    const scope = 'openid profile';
    const state = 'some_state';
    const nonce = 'some_nonce';

    const url = `${oidcConfig.authorization_endpoint}?client_id=${clientId}&redirect_uri=${redirectUri}&response_type=${responseType}&scope=${scope}&state=${state}&nonce=${nonce}&code_challenge=${code_challenge}&code_challenge_method=S256`;
    window.location.href = url;
  });

  const urlParams = new URLSearchParams(window.location.search);
  const code = urlParams.get('code');
  if (code) {
    const code_verifier = sessionStorage.getItem('code_verifier');
    const client_secret = sessionStorage.getItem('client_secret');
    
    if (!client_secret) {
      displayResults({ error: 'Client secret not found. Please start authorization again.' });
      return;
    }
    
    // We need to discover the config again to get the issuer for the token exchange
    discover().then(() => {
      fetch(oidcConfig.token_endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          grant_type: 'authorization_code',
          code,
          redirect_uri: oidcConfig.issuer,
          client_id: 'steam-auth-client',
          client_secret: client_secret,
          code_verifier
        })
      })
      .then(res => res.json())
      .then(data => displayResults(data))
      .catch(err => displayResults({ error: err.message }));
    });
  }

  // Restore client secret from session if available
  const savedSecret = sessionStorage.getItem('client_secret');
  if (savedSecret) {
    document.getElementById('client-secret').value = savedSecret;
  }
  
  // Discover on page load
  discover();
});