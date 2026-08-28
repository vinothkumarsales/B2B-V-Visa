interface DecodedToken {
  iss: string;
  aud: string;
  sub: string;
  email: string;
  email_verified: boolean;
  name?: string;
  picture?: string;
  phone_number?: string;
  [key: string]: any;
}

let jwkCache: { keys: any[]; expiry: number } | null = null;

async function fetchJwks(): Promise<any[]> {
  const now = Date.now();
  if (jwkCache && jwkCache.expiry > now) {
    return jwkCache.keys;
  }

  const res = await fetch('https://www.googleapis.com/service_accounts/v1/jwk/securetoken-system@system.gserviceaccount.com');
  if (!res.ok) throw new Error('Failed to fetch Firebase public keys');
  const data = await res.json();
  const keys = data.keys || [];
  
  // Cache public keys for 1 hour
  jwkCache = { keys, expiry: now + 3600 * 1000 };
  return keys;
}

export async function verifyFirebaseIdToken(token: string): Promise<DecodedToken> {
  const parts = token.split('.');
  if (parts.length !== 3) throw new Error('Invalid JWT format');

  const [headerB64, payloadB64, signatureB64] = parts;
  
  const header = JSON.parse(Buffer.from(headerB64, 'base64url').toString('utf8'));
  const payload = JSON.parse(Buffer.from(payloadB64, 'base64url').toString('utf8')) as DecodedToken;

  const kid = header.kid;
  if (!kid) throw new Error('Missing kid header');

  const projectId = 'v-visas-07';
  if (payload.iss !== `https://securetoken.google.com/${projectId}`) {
    throw new Error('Invalid issuer');
  }
  if (payload.aud !== projectId) {
    throw new Error('Invalid audience');
  }
  
  const exp = payload.exp;
  if (!exp || exp < Date.now() / 1000) {
    throw new Error('Token has expired');
  }

  const keys = await fetchJwks();
  const jwk = keys.find((k: any) => k.kid === kid);
  if (!jwk) throw new Error('Public key not found for kid');

  const cryptoKey = await crypto.subtle.importKey(
    'jwk',
    jwk,
    {
      name: 'RSASSA-PKCS1-v1_5',
      hash: { name: 'SHA-256' },
    },
    false,
    ['verify']
  );

  const signatureBytes = Buffer.from(signatureB64, 'base64url');
  const dataBytes = Buffer.from(`${headerB64}.${payloadB64}`, 'utf8');

  const verified = await crypto.subtle.verify(
    'RSASSA-PKCS1-v1_5',
    cryptoKey,
    signatureBytes,
    dataBytes
  );

  if (!verified) throw new Error('Signature verification failed');

  return payload;
}
