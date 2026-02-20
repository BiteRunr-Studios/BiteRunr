import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from 'react'
import { loginAction, verifyTokenAction } from '@/server/auth'

interface AuthContextValue {
  isAuthenticated: boolean
  login: (username: string, password: string) => Promise<boolean>
  logout: () => void
}

const SESSION_KEY = 'admin_session_token'

const AuthContext = createContext<AuthContextValue | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [isAuthenticated, setIsAuthenticated] = useState(() => {
    if (typeof window === 'undefined') return false
    return sessionStorage.getItem(SESSION_KEY) !== null
  })

  // Validate stored token against the server on mount
  useEffect(() => {
    const storedToken = sessionStorage.getItem(SESSION_KEY)
    if (!storedToken) return

    verifyTokenAction({ data: { token: storedToken } }).then(({ valid }) => {
      if (!valid) {
        sessionStorage.removeItem(SESSION_KEY)
        setIsAuthenticated(false)
      }
    })
  }, [])

  const login = async (
    username: string,
    password: string,
  ): Promise<boolean> => {
    const result = await loginAction({ data: { username, password } })

    if (result.success && result.token) {
      sessionStorage.setItem(SESSION_KEY, result.token)
      setIsAuthenticated(true)
      return true
    }

    return false
  }

  const logout = () => {
    setIsAuthenticated(false)
    sessionStorage.removeItem(SESSION_KEY)
  }

  return (
    <AuthContext.Provider value={{ isAuthenticated, login, logout }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}
