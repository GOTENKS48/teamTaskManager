/**
 * API Client — Fetch wrapper with JWT token management
 */
const API_BASE = '/api';

function getToken() {
  return localStorage.getItem('token');
}

function setToken(token) {
  localStorage.setItem('token', token);
}

function removeToken() {
  localStorage.removeItem('token');
  localStorage.removeItem('user');
}

function getUser() {
  const u = localStorage.getItem('user');
  return u ? JSON.parse(u) : null;
}

function setUser(user) {
  localStorage.setItem('user', JSON.stringify(user));
}

function isLoggedIn() {
  return !!getToken();
}

function logout() {
  removeToken();
  window.location.href = '/';
}

async function api(endpoint, options = {}) {
  const url = `${API_BASE}${endpoint}`;
  const headers = { 'Content-Type': 'application/json' };
  const token = getToken();
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const res = await fetch(url, { ...options, headers: { ...headers, ...options.headers } });
  const data = await res.json();

  if (res.status === 401) {
    removeToken();
    window.location.href = '/';
    return;
  }

  if (!res.ok) {
    throw new Error(data.message || 'Something went wrong');
  }

  return data;
}

const API = {
  // Auth
  signup: (body) => api('/auth/signup', { method: 'POST', body: JSON.stringify(body) }),
  login: (body) => api('/auth/login', { method: 'POST', body: JSON.stringify(body) }),
  me: () => api('/auth/me'),
  forgotPassword: (body) => api('/auth/forgot-password', { method: 'POST', body: JSON.stringify(body) }),
  resetPassword: (body) => api('/auth/reset-password', { method: 'POST', body: JSON.stringify(body) }),

  // Projects
  getProjects: () => api('/projects'),
  getProject: (id) => api(`/projects/${id}`),
  createProject: (body) => api('/projects', { method: 'POST', body: JSON.stringify(body) }),
  updateProject: (id, body) => api(`/projects/${id}`, { method: 'PUT', body: JSON.stringify(body) }),
  deleteProject: (id) => api(`/projects/${id}`, { method: 'DELETE' }),

  // Members
  getMembers: (pid) => api(`/projects/${pid}/members`),
  addMember: (pid, body) => api(`/projects/${pid}/members`, { method: 'POST', body: JSON.stringify(body) }),
  updateMemberRole: (pid, uid, body) => api(`/projects/${pid}/members/${uid}`, { method: 'PUT', body: JSON.stringify(body) }),
  removeMember: (pid, uid) => api(`/projects/${pid}/members/${uid}`, { method: 'DELETE' }),

  // Tasks
  getTasks: (pid, query = '') => api(`/projects/${pid}/tasks${query ? '?' + query : ''}`),
  getTask: (pid, tid) => api(`/projects/${pid}/tasks/${tid}`),
  createTask: (pid, body) => api(`/projects/${pid}/tasks`, { method: 'POST', body: JSON.stringify(body) }),
  updateTask: (pid, tid, body) => api(`/projects/${pid}/tasks/${tid}`, { method: 'PUT', body: JSON.stringify(body) }),
  deleteTask: (pid, tid) => api(`/projects/${pid}/tasks/${tid}`, { method: 'DELETE' }),

  // Dashboard
  getDashboard: () => api('/dashboard'),
};
