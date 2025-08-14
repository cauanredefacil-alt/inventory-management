// Lightweight API service using fetch, no external dependencies.
// Exposes get/post/delete returning an object with a `data` field, similar to axios.

const BASE_URL = process.env.REACT_APP_API_BASE_URL || '';

async function handleResponse(resp) {
  const contentType = resp.headers.get('content-type') || '';
  let body = null;
  try {
    if (contentType.includes('application/json')) {
      body = await resp.json();
    } else {
      body = await resp.text();
    }
  } catch (e) {
    body = null;
  }
  if (!resp.ok) {
    const error = new Error((body && body.error) || (body && body.detail) || resp.statusText);
    error.status = resp.status;
    error.data = body;
    throw error;
  }
  return { data: body, status: resp.status };
}

function toQuery(params) {
  if (!params) return '';
  const usp = new URLSearchParams(params);
  const s = usp.toString();
  return s ? `?${s}` : '';
}

const api = {
  async get(path, { params, headers } = {}) {
    const resp = await fetch(`${BASE_URL}${path}${toQuery(params)}`, {
      method: 'GET',
      headers: { 'Accept': 'application/json', ...(headers || {}) },
      credentials: 'include',
    });
    return handleResponse(resp);
  },

  async post(path, body, { headers } = {}) {
    const isFormData = body instanceof FormData;
    const resp = await fetch(`${BASE_URL}${path}`, {
      method: 'POST',
      headers: isFormData ? { ...(headers || {}) } : { 'Content-Type': 'application/json', ...(headers || {}) },
      body: isFormData ? body : JSON.stringify(body || {}),
      credentials: 'include',
    });
    return handleResponse(resp);
  },

  async delete(path, { headers } = {}) {
    const resp = await fetch(`${BASE_URL}${path}`, {
      method: 'DELETE',
      headers: { 'Accept': 'application/json', ...(headers || {}) },
      credentials: 'include',
    });
    return handleResponse(resp);
  },
};

export default api;
