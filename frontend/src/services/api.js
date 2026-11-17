const apiBase = import.meta.env.VITE_API_URL || '/api';

async function request(path, options = {}) {
  const headers = new Headers(options.headers || {});
  const token = localStorage.getItem('northstar_token');

  if (token) headers.set('Authorization', `Bearer ${token}`);
  if (options.body && !(options.body instanceof FormData)) {
    headers.set('Content-Type', 'application/json');
  }

  let response;
  try {
    response = await fetch(`${apiBase}${path}`, {
      ...options,
      headers,
      signal: options.signal || AbortSignal.timeout(60000),
    });
  } catch (error) {
    if (error.name === 'TimeoutError') {
      throw new Error('The request took too long. Check your connection and try again.');
    }
    throw new Error('Could not reach the backend. Make sure it is running and try again.');
  }
  const result = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(result.message || 'Something went wrong. Please try again.');
  }

  return result;
}

export const api = {
  register: (details) => request('/auth/register', {
    method: 'POST',
    body: JSON.stringify(details),
  }),
  login: (details) => request('/auth/login', {
    method: 'POST',
    body: JSON.stringify(details),
  }),
  me: () => request('/auth/me'),
  listDatasets: () => request('/datasets'),
  uploadDataset: (file, name) => {
    const form = new FormData();
    form.append('file', file);
    if (name) form.append('name', name);
    return request('/datasets/upload', { method: 'POST', body: form });
  },
  getDataset: (id) => request(`/datasets/${id}`),
  previewDataset: (id) => request(`/datasets/${id}/rows?limit=100`),
  listConnections: () => request('/connections'),
  createConnection: (details) => request('/connections', {
    method: 'POST',
    body: JSON.stringify(details),
  }),
  getConnectionSchema: (id) => request(`/connections/${id}/schema`),
  askQuestion: (details) => request('/query/ask', {
    method: 'POST',
    body: JSON.stringify(details),
  }),
};
