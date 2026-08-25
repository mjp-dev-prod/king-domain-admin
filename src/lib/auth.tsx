import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from 'react'
import { api, type AdminUser } from './api'

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
    api
      .me()
      .then(({ user }) => setUser(user))
      // A 401 here is the normal "not signed in" case, not an error worth surfacing.
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
