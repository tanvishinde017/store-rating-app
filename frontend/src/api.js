const API_URL = import.meta.env.VITE_API_URL || '/api';

const TOKEN_KEY = 'store_rating_token';

export function getToken() {
  return localStorage.getItem(TOKEN_KEY);
}

export function setToken(token) {
  if (token) {
    localStorage.setItem(TOKEN_KEY, token);
  } else {
    localStorage.removeItem(TOKEN_KEY);
  }
}

// Performs an API call and normalises the response / error shape.
export async function api(path, { method = 'GET', body, params } = {}) {
  const headers = { 'Content-Type': 'application/json' };
  const token = getToken();
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  let url = `${API_URL}${path}`;
  if (params) {
    const search = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        search.append(key, value);
      }
    });
    const qs = search.toString();
    if (qs) {
      url += `?${qs}`;
    }
  }

  const res = await fetch(url, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });

  let data = null;
  try {
    data = await res.json();
  } catch (err) {
    data = null;
  }

  if (!res.ok) {
    const message = (data && data.message) || `Request failed (${res.status})`;
    const error = new Error(message);
    error.status = res.status;
    throw error;
  }

  return data;
}

export const authApi = {
  signup: (payload) => api('/auth/signup', { method: 'POST', body: payload }),
  login: (payload) => api('/auth/login', { method: 'POST', body: payload }),
  me: () => api('/auth/me'),
  changePassword: (payload) => api('/auth/password', { method: 'PUT', body: payload }),
};

export const storeApi = {
  list: (params) => api('/stores', { params }),
  get: (id) => api(`/stores/${id}`),
  create: (payload) => api('/stores', { method: 'POST', body: payload }),
  update: (id, payload) => api(`/stores/${id}`, { method: 'PUT', body: payload }),
  remove: (id) => api(`/stores/${id}`, { method: 'DELETE' }),
  rate: (storeId, rating) =>
    api(`/stores/${storeId}/ratings`, { method: 'POST', body: { rating } }),
  ratings: (storeId) => api(`/stores/${storeId}/ratings`),
};

export const ownerApi = {
  dashboard: () => api('/owner/dashboard'),
  stores: () => api('/owner/stores'),
  storeRatings: (id) => api(`/owner/stores/${id}/ratings`),
};

export const adminApi = {
  dashboard: () => api('/admin/dashboard'),
  users: (params) => api('/admin/users', { params }),
  user: (id) => api(`/admin/users/${id}`),
  createUser: (payload) => api('/admin/users', { method: 'POST', body: payload }),
  updateUser: (id, payload) => api(`/admin/users/${id}`, { method: 'PUT', body: payload }),
  deleteUser: (id) => api(`/admin/users/${id}`, { method: 'DELETE' }),
  stores: (params) => api('/admin/stores', { params }),
};