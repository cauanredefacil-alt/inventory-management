import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Textarea } from '../components/ui/textarea';
import agentService from '../services/agentService';
import userService from '../services/userService';

function parseSites(text) {
  return Array.from(
    new Set(
      (text || '')
        .split(/[\n,]/g)
        .map((s) => s.trim())
        .filter(Boolean)
    )
  );
}

const BlockSites = () => {
  const [sitesText, setSitesText] = React.useState('');
  const [agentKey, setAgentKey] = React.useState('');
  const [loading, setLoading] = React.useState(false);
  const [message, setMessage] = React.useState('');
  const [error, setError] = React.useState('');
  const [blocked, setBlocked] = React.useState([]);
  const [machineInfo, setMachineInfo] = React.useState(null);
  const [users, setUsers] = React.useState([]);
  const [selectedUser, setSelectedUser] = React.useState(null);
  const [showModal, setShowModal] = React.useState(false);

  React.useEffect(() => {
    (async () => {
      try {
        // 1) Tenta carregar chave do localStorage
        const k = localStorage.getItem('agentKey');
        if (k) setAgentKey(k);
        // 2) Bootstrap do agente para auto-preencher chave/máquina
        const boot = await agentService.bootstrap();
        setMachineInfo({ device: boot?.device_name, code: boot?.machine_code });
        if (boot?.agent_key && boot.agent_key !== k) {
          try { localStorage.setItem('agentKey', boot.agent_key); } catch (_) {}
          setAgentKey(boot.agent_key);
        }
      } catch (e) {
        // silencioso; continuará fluxo normal
      }
    })();
  }, []);

  const loadBlocked = React.useCallback(async () => {
    try {
      const res = await agentService.getBlockedSites(agentKey || null);
      setBlocked(Array.isArray(res?.items) ? res.items : []);
    } catch (e) {
    }
  }, [agentKey]);

  React.useEffect(() => {
    loadBlocked();
  }, [loadBlocked]);

  // Carregar usuários
  React.useEffect(() => {
    (async () => {
      try {
        const list = await userService.list();
        setUsers(list);
      } catch (e) {
        // silencioso na UI principal
      }
    })();
  }, []);

  const withFeedback = async (fn) => {
    setLoading(true);
    setMessage('');
    setError('');
    try {
      const res = await fn();
      setMessage(res?.message || 'Operação concluída com sucesso.');
    } catch (e) {
      setError(e?.message || String(e));
    } finally {
      setLoading(false);
    }
  };

  const handleSaveKey = () => {
    try { localStorage.setItem('agentKey', agentKey || ''); } catch (_) {}
    setMessage('Chave salva localmente.');
    // Recarrega a lista após salvar a chave
    loadBlocked();
  };

  const handleBlock = async () => {
    const sites = parseSites(sitesText);
    if (!sites.length) {
      setError('Informe ao menos um domínio.');
      return;
    }
    await withFeedback(() => agentService.blockSites(sites, agentKey || null));
    await loadBlocked();
  };

  const handleUnblock = async () => {
    const sites = parseSites(sitesText);
    if (!sites.length) {
      setError('Informe ao menos um domínio.');
      return;
    }
    await withFeedback(() => agentService.unblockSites(sites, agentKey || null));
    await loadBlocked();
  };

  const handleDeleteOne = async (site) => {
    await withFeedback(() => agentService.unblockSites([site], agentKey || null));
    await loadBlocked();
  };

  const openForUser = (user) => {
    setSelectedUser(user);
    setShowModal(true);
  };

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Lista de usuários */}
      <Card>
        <CardHeader>
          <CardTitle>Usuários</CardTitle>
        </CardHeader>
        <CardContent>
          {users.length === 0 ? (
            <div className="text-sm text-muted-foreground">Nenhum usuário encontrado.</div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
              {users.map((u) => (
                <Button key={u._id || u.name} variant="outline" className="justify-start" onClick={() => openForUser(u)}>
                  {u.name}
                </Button>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Modal para bloquear sites por usuário (UI existente) */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/50" onClick={() => setShowModal(false)} />
          <div className="relative bg-white w-full max-w-3xl mx-4 rounded shadow-lg">
            <Card>
              <CardHeader>
                <CardTitle>
                  Bloquear Sites {selectedUser ? `· Usuário: ${selectedUser.name}` : ''}
                  {machineInfo && (
                    <span className="block text-sm text-muted-foreground font-normal">{machineInfo.device || 'Máquina'} · Código: {machineInfo.code || '-'}</span>
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid gap-4">
                  <div>
                    <label className="text-sm text-muted-foreground">Domínios (um por linha ou separados por vírgula)</label>
                    <Textarea
                      className="mt-1"
                      rows={8}
                      placeholder={"ex.:\nyoutube.com\nwww.facebook.com\ninstagram.com"}
                      value={sitesText}
                      onChange={(e) => setSitesText(e.target.value)}
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-2 items-end">
                    <div className="md:col-span-2">
                      <label className="text-sm text-muted-foreground">X-AGENT-KEY (opcional se o agente não exigir)</label>
                      <Input
                        type="text"
                        placeholder="Chave do agente"
                        value={agentKey}
                        onChange={(e) => setAgentKey(e.target.value)}
                      />
                    </div>
                    <div>
                      <Button onClick={handleSaveKey} variant="outline" className="w-full">Salvar chave</Button>
                    </div>
                  </div>

                  <div className="flex flex-col sm:flex-row gap-2">
                    <Button disabled={loading} onClick={handleBlock} className="sm:w-auto w-full">{loading ? 'Processando...' : 'Bloquear'}</Button>
                    <Button disabled={loading} onClick={handleUnblock} variant="secondary" className="sm:w-auto w-full">{loading ? 'Processando...' : 'Desbloquear'}</Button>
                  </div>

                  {message && (
                    <div className="text-sm text-green-600">{message}</div>
                  )}
                  {error && (
                    <div className="text-sm text-red-600">{error}</div>
                  )}

                  {/* Lista de sites bloqueados */}
                  <div className="mt-4">
                    <div className="text-sm font-medium mb-2">Sites bloqueados</div>
                    {blocked.length === 0 ? (
                      <div className="text-sm text-muted-foreground">Nenhum site bloqueado.</div>
                    ) : (
                      <div className="space-y-2">
                        {blocked.map((site) => (
                          <div key={site} className="flex items-center justify-between border rounded px-3 py-2">
                            <span className="text-sm break-all">{site}</span>
                            <div className="flex items-center gap-2">
                              <Button
                                size="sm"
                                variant="destructive"
                                onClick={() => handleDeleteOne(site)}
                                disabled={loading}
                              >
                                Excluir
                              </Button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
                <div className="mt-4 flex justify-end">
                  <Button variant="outline" onClick={() => setShowModal(false)}>Fechar</Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      )}
    </div>
  );
};

export default BlockSites;
