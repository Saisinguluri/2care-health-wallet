import axios from 'axios';

const api = axios.create({
  baseURL: '/api',
  headers: { 'Content-Type': 'application/json' },
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      if (!window.location.pathname.startsWith('/login') && !window.location.pathname.startsWith('/register')) {
        window.location.href = '/login';
      }
    }
    return Promise.reject(err);
  }
);

export default api;

// Auth
export const authApi = {
  register: (data) => api.post('/auth/register', data),
  login: (data) => api.post('/auth/login', data),
  me: () => api.get('/auth/me'),
};

// Reports
export const reportsApi = {
  list: (params) => api.get('/reports', { params }),
  get: (id) => api.get(`/reports/${id}`),
  create: (formData) => api.post('/reports', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  }),
  update: (id, data) => api.patch(`/reports/${id}`, data),
  delete: (id) => api.delete(`/reports/${id}`),
  download: (id) => api.get(`/reports/${id}/download`, { responseType: 'blob' }),
  getTypes: () => api.get('/reports/meta/types'),
};

// Vitals
export const vitalsApi = {
  list: (params) => api.get('/vitals', { params }),
  create: (data) => api.post('/vitals', data),
  delete: (id) => api.delete(`/vitals/${id}`),
  trends: (params) => api.get('/vitals/trends', { params }),
  summary: () => api.get('/vitals/summary'),
};

// Shares
export const sharesApi = {
  sent: () => api.get('/shares/sent'),
  received: () => api.get('/shares/received'),
  create: (data) => api.post('/shares', data),
  revoke: (id) => api.delete(`/shares/${id}`),
};

// Users
export const usersApi = {
  search: (email) => api.get('/users/search', { params: { email } }),
  dashboard: () => api.get('/users/dashboard'),
};
