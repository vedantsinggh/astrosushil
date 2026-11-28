import axios from 'axios';

import { API_BASE_URL as BASE_URL } from "../config/api";
const AUTH_URL = `${BASE_URL}/auth`;
const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);

let csrfToken = null;
let refreshInFlight = null;

export function setAuthCsrfToken(token) {
  csrfToken = token || null;
}

export async function loadAuthCsrfToken() {
  if (csrfToken) return csrfToken;
  try {
    const response = await axios.get(`${AUTH_URL}/csrf`, { withCredentials: true });
    setAuthCsrfToken(response.data?.csrfToken);
  } catch {
    setAuthCsrfToken(null);
  }
  return csrfToken;
}

axios.defaults.withCredentials = true;

axios.interceptors.request.use(async (request) => {
  const method = (request.method || 'GET').toUpperCase();
  if (!SAFE_METHODS.has(method)) {
    await loadAuthCsrfToken();
    if (csrfToken) request.headers.set('X-CSRF-Token', csrfToken);
  }
  return request;
});

axios.interceptors.response.use(
  (response) => response,
  async (error) => {
    const request = error.config;
    const url = request?.url || '';
    const isAuthEndpoint = /\/auth\/(?:csrf|refresh|phone\/verify-otp|email\/verify-otp)$/.test(url);
    if (error.response?.status !== 401 || !request || request._cookieAuthRetried || isAuthEndpoint) {
      return Promise.reject(error);
    }

    request._cookieAuthRetried = true;
    await loadAuthCsrfToken();
    if (!csrfToken) return Promise.reject(error);

    refreshInFlight ||= axios
      .post(`${AUTH_URL}/refresh`, {}, { withCredentials: true, headers: { 'X-CSRF-Token': csrfToken } })
      .then((response) => {
        setAuthCsrfToken(response.data?.csrfToken);
        return Boolean(csrfToken);
      })
      .catch(() => {
        setAuthCsrfToken(null);
        return false;
      })
      .finally(() => { refreshInFlight = null; });

    if (!(await refreshInFlight)) return Promise.reject(error);
    return axios(request);
  },
);
