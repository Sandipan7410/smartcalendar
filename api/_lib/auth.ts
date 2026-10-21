/**
 * Verifies the Firebase ID token the browser sends in the Authorization header.
 *
 * This stops random visitors (or scripts) from calling the Gemini endpoints
 * directly and spending your API quota: only people signed in to your app's
 * Firebase project (anonymous or Google) get through.
 *
 * Tokens are checked against Google's public signing keys, so no service-account
 * secret is needed. See:
 * https://firebase.google.com/docs/auth/admin/verify-id-tokens#verify_id_tokens_using_a_third-party_jwt_library
 */
import { createRemoteJWKSet, jwtVerify } from 'jose';

const FIREBASE_JWKS = createRemoteJWKSet(
  new URL('https://www.googleapis.com/service_accounts/v1/jwk/securetoken@system.gserviceaccount.com')
);

// The Firebase project ID is public (it's in the web config), so a default is fine here.
// Override with FIREBASE_PROJECT_ID if you move the app to another Firebase project.
const DEFAULT_PROJECT_ID = 'gen-lang-client-0189013284';

function projectId(): string {
  return process.env.FIREBASE_PROJECT_ID || process.env.VITE_FIREBASE_PROJECT_ID || DEFAULT_PROJECT_ID;
}

export type AuthResult = { ok: true; uid: string } | { ok: false; error: string };

export async function verifyFirebaseRequest(authorizationHeader: string | string[] | undefined): Promise<AuthResult> {
  // Escape hatch for local experiments only. Never set this on Vercel.
  if (process.env.REQUIRE_AUTH === 'false') {
    return { ok: true, uid: 'local-dev' };
  }

  const header = Array.isArray(authorizationHeader) ? authorizationHeader[0] : authorizationHeader;
  const match = header?.match(/^Bearer\s+(.+)$/i);
  if (!match) {
    return { ok: false, error: 'Sign-in required' };
  }

  try {
    const pid = projectId();
    const { payload } = await jwtVerify(match[1], FIREBASE_JWKS, {
      issuer: `https://securetoken.google.com/${pid}`,
      audience: pid,
      algorithms: ['RS256'],
    });
    if (!payload.sub) {
      return { ok: false, error: 'Invalid token' };
    }
    return { ok: true, uid: payload.sub };
  } catch {
    return { ok: false, error: 'Invalid or expired token' };
  }
}
