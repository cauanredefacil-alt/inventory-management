// Service to communicate with the local Wallpaper Agent (FastAPI) running on port 8002
// Uses query param x_agent_key to authenticate (the agent generates/stores the key locally)

const AGENT_BASE = `${window.location.protocol}//${window.location.hostname}:8002`;

async function request(path, { method = 'GET', body, xAgentKey } = {}) {
  const url = new URL(path, AGENT_BASE);
  if (xAgentKey) url.searchParams.set('x_agent_key', xAgentKey);
  const resp = await fetch(url.toString(), {
    method,
    headers: {
      'Content-Type': 'application/json',
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  let data = null;
  let text = '';
  // Try JSON first
  try {
    data = await resp.clone().json();
  } catch (_) {
    // Not JSON or failed; fall back to text
    try { text = await resp.text(); } catch {}
  }
  if (!resp.ok) {
    const msg = (data && (data.detail || data.message)) || text || `HTTP ${resp.status}`;
    const err = new Error(msg);
    err.status = resp.status;
    err.body = data;
    throw err;
  }
  return data;
}

export const agentService = {
  blockSites: (websites, xAgentKey) => request('/block_sites', { method: 'POST', body: { websites }, xAgentKey }),
  unblockSites: (websites, xAgentKey) => request('/unblock_sites', { method: 'POST', body: { websites }, xAgentKey }),
  getBlockedSites: (xAgentKey) => request(`/blocked_sites${xAgentKey ? `?x_agent_key=${encodeURIComponent(xAgentKey)}` : ''}`),
  bootstrap: () => request('/bootstrap'),
  setUser: (user_id, agent_key) => request('/set_user', { method: 'POST', body: { user_id, agent_key } }),
  test: () => request('/test-cors'),
};

export default agentService;
