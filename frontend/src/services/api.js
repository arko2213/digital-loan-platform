import axios from 'axios';
const api = axios.create({ baseURL: import.meta.env.VITE_API_URL || '/api' });
api.interceptors.request.use(config => {
  const token = localStorage.getItem('dl_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(
  response => response,
  error => {
    if (error.response?.status === 401) {
      const hadToken = Boolean(localStorage.getItem('dl_token'));
      // Remove stale authentication data
      localStorage.removeItem('dl_token');
      localStorage.removeItem('dl_user');
      if (hadToken) {
        // Notify the app (optional)
        window.dispatchEvent(new CustomEvent('dl_session_expired', {
          detail: error.response?.data?.message || 'Your session is invalid or has expired.'
        }));
        // Immediately redirect to login for a fresh session
        if (typeof window !== 'undefined') {
          window.location.href = '/login';
        }
      }
    }
    return Promise.reject(error);
  }
);

export const money = value => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(Number(value) || 0);
export const friendlyError = e => e?.response?.data?.message || 'Unable to complete your request. Please try again.';
export default api;
