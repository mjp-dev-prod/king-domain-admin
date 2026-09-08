// Plain localStorage, not a state library — this app doesn't have one, and
// the only consumer that needs reactivity (AuthProvider) already re-checks
// via api.me() on mount. Pattern matches pendu-admin's authStore.ts, minus
// the zustand dependency this project doesn't otherwise use.
const ACCESS_TOKEN_KEY = 'kd_admin_access_token'
const REFRESH_TOKEN_KEY = 'kd_admin_refresh_token'

export function getAccessToken() {
  return localStorage.getItem(ACCESS_TOKEN_KEY)
}

export function getRefreshToken() {
  return localStorage.getItem(REFRESH_TOKEN_KEY)
}

export function setTokens({
  accessToken,
  refreshToken,
}: {
  accessToken: string
  refreshToken?: string
}) {
  localStorage.setItem(ACCESS_TOKEN_KEY, accessToken)
  // Login/accept-invite return both; a silent refresh only returns a new
  // access token, so don't overwrite the still-valid refresh token with
  // nothing when it isn't present.
  if (refreshToken) localStorage.setItem(REFRESH_TOKEN_KEY, refreshToken)
}

export function clearTokens() {
  localStorage.removeItem(ACCESS_TOKEN_KEY)
  localStorage.removeItem(REFRESH_TOKEN_KEY)
}
