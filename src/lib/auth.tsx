import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from 'react'
import { api, type AdminUser } from './api'
import { getAccessToken } from './tokenStore'

type AuthState = {
  user: AdminUser | null
  loading: boolean
  setUser: (user: AdminUser | null) => void
  signOut: () => Promise<void>
}

const AuthContext = createContext<AuthState | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AdminUser | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // No stored token at all is the common case (never logged in, or fully
    // signed out) — skip the network round trip entirely rather than firing
    // a request that's guaranteed to 401.
    if (!getAccessToken()) {
      setLoading(false)
      return
    }

    api
      .me()
      .then(({ user }) => setUser(user))
      // A 401 here (expired refresh token too) is the normal "not signed
      // in" case, not an error worth surfacing.
      .catch(() => setUser(null))
      .finally(() => setLoading(false))
  }, [])

  async function signOut() {
    await api.logout().catch(() => {})
    setUser(null)
  }

  return (
    <AuthContext.Provider value={{ user, loading, setUser, signOut }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) throw new Error('useAuth must be used inside AuthProvider')
  return context
}
