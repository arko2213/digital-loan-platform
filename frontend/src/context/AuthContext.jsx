import { createContext, useContext, useEffect, useState } from 'react';
import api from '../services/api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem('dl_user'));
    } catch {
      return null;
    }
  });

  useEffect(() => {
    const onExpired = () => setUser(null);
    window.addEventListener('dl_session_expired', onExpired);

    // Verify token validity on boot if a token exists
    const token = localStorage.getItem('dl_token');
    if (token) {
      api.get('/auth/profile')
        .then(res => {
          if (res.data?.user) {
            localStorage.setItem('dl_user', JSON.stringify(res.data.user));
            setUser(res.data.user);
          }
        })
        .catch(err => {
          if (err.response?.status === 401) {
            localStorage.removeItem('dl_token');
            localStorage.removeItem('dl_user');
            setUser(null);
          }
        });
    }

    return () => window.removeEventListener('dl_session_expired', onExpired);
  }, []);

  async function authenticate(path, data) {
    const { data: result } = await api.post(`/auth/${path}`, data);
    localStorage.setItem('dl_token', result.token);
    localStorage.setItem('dl_user', JSON.stringify(result.user));
    setUser(result.user);
    return result.user;
  }

  async function demoLogin(role = 'user') {
    const { data: result } = await api.post('/auth/demo-login', { role });
    localStorage.setItem('dl_token', result.token);
    localStorage.setItem('dl_user', JSON.stringify(result.user));
    setUser(result.user);
    return result.user;
  }

  function logout() {
    localStorage.removeItem('dl_token');
    localStorage.removeItem('dl_user');
    setUser(null);
  }

  function updateUser(next) {
    localStorage.setItem('dl_user', JSON.stringify(next));
    setUser(next);
  }

  return (
    <AuthContext.Provider value={{ user, authenticate, demoLogin, logout, updateUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
