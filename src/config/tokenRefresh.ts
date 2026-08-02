import { tokenStorage } from "./api";

let refreshPromise: Promise<string | null> | null = null;

function extractTokens(data: any): {
  accessToken?: string;
  refreshToken?: string;
} {
  const body = data?.data || data;
  return {
    accessToken: body?.accessToken || data?.accessToken,
    refreshToken: body?.refreshToken || data?.refreshToken,
  };
}

// Single-flight token refresh: concurrent callers share the same request
export async function refreshAccessToken(): Promise<string | null> {
  const refreshToken = tokenStorage.getRefreshToken();
  if (!refreshToken) return null;

  if (refreshPromise) return refreshPromise;

  refreshPromise = (async () => {
    try {
      const response = await fetch(
        `${import.meta.env.VITE_API_BASE_URL}/auth/refresh-token`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ refreshToken }),
        }
      );

      if (!response.ok) {
        // Refresh token was rejected (expired/invalid) — session is dead
        tokenStorage.clearTokens();
        return null;
      }

      const data = await response.json();
      const { accessToken, refreshToken: newRefreshToken } =
        extractTokens(data);

      if (!accessToken) return null;

      tokenStorage.setTokens(accessToken, newRefreshToken);
      return accessToken;
    } catch {
      // Network error — keep tokens, retry later
      return null;
    } finally {
      refreshPromise = null;
    }
  })();

  return refreshPromise;
}

function decodeTokenPayload(token: string): Record<string, any> | null {
  const parts = token.split(".");
  if (parts.length !== 3) return null;

  try {
    let base64 = parts[1].replace(/-/g, "+").replace(/_/g, "/");
    base64 = base64.padEnd(
      base64.length + ((4 - (base64.length % 4)) % 4),
      "="
    );
    return JSON.parse(atob(base64));
  } catch {
    return null;
  }
}

// Returns the access token expiry timestamp (ms), or null if it's not a JWT
export function getAccessTokenExpiry(): number | null {
  const token = tokenStorage.getAccessToken();
  if (!token) return null;

  const payload = decodeTokenPayload(token);
  if (!payload || typeof payload.exp !== "number") return null;

  return payload.exp * 1000;
}

export function isAccessTokenExpired(marginMs = 0): boolean {
  const expiry = getAccessTokenExpiry();
  if (expiry === null) return false;
  return Date.now() + marginMs >= expiry;
}
