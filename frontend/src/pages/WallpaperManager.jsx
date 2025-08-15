import { useState, useEffect, useRef, useMemo } from 'react';
import { Button } from '../components/ui/button';
import { UploadIcon, ReloadIcon, GearIcon, Cross2Icon } from '@radix-ui/react-icons';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { toast } from 'sonner';
import machineService from '../services/machineService';
import ItemModal from '../components/ItemModal';
import LocationModal from '../components/LocationModal';
import api from '../services/apiService';
import MachineCodeModal from '../components/MachineCodeModal';
import * as Dialog from '@radix-ui/react-dialog';

export default function WallpaperManager() {
  const [machines, setMachines] = useState([]);
  const [agentStatuses, setAgentStatuses] = useState({}); // { machineId: { loading, error, data } }
  const [uploading, setUploading] = useState({}); // { machineId: boolean }
  const fileInputsRef = useRef({}); // { machineId: inputRef }
  const [isAddItemModalOpen, setIsAddItemModalOpen] = useState(false);
  const [isLocationModalOpen, setIsLocationModalOpen] = useState(false);
  const [locations, setLocations] = useState([]); // saved locations from LocationModal
  const [isMachineCodeModalOpen, setIsMachineCodeModalOpen] = useState(false);
  const [isInfoOpen, setIsInfoOpen] = useState(false);
  const [infoTargetId, setInfoTargetId] = useState(null);
  const [selectedMac, setSelectedMac] = useState('');

  const styles = [
    { value: 'preencher', label: 'Preencher' },
    { value: 'ajustar', label: 'Ajustar' },
    { value: 'estender', label: 'Estender' },
    { value: 'ladrilhar', label: 'Ladrilhar' },
    { value: 'centralizar', label: 'Centralizar' },
    { value: 'esticar', label: 'Esticar' }
  ];

  const fetchMachines = async () => {
    try {
      const list = await machineService.getAllMachines();
      setMachines(list);
      // Após carregar máquinas, buscar status dos agentes
      list.forEach((m) => fetchAgentStatus(m));
    } catch (e) {
      toast.error('Erro ao carregar máquinas');
      console.error(e);
    }
  };

  const fetchLocations = async () => {
    try {
      const res = await api.get('/api/locations');
      setLocations(Array.isArray(res.data) ? res.data : []);
    } catch (e) {
      console.error('Erro ao carregar localizações:', e);
      setLocations([]);
    }
  };

  const fetchAgentStatus = async (machine) => {
    if (!machine?.agentUrl) {
      setAgentStatuses((prev) => ({ ...prev, [machine._id]: { loading: false, error: 'Sem agentUrl', data: null } }));
      return;
    }
    setAgentStatuses((prev) => ({ ...prev, [machine._id]: { loading: true, error: null, data: prev[machine._id]?.data || null } }));
    try {
      const res = await fetch(`${machine.agentUrl}/obter_status`, { method: 'GET' });
      if (!res.ok) throw new Error('Falha ao obter status');
      const data = await res.json();
      setAgentStatuses((prev) => ({ ...prev, [machine._id]: { loading: false, error: null, data } }));
    } catch (e) {
      setAgentStatuses((prev) => ({ ...prev, [machine._id]: { loading: false, error: e.message || 'Erro', data: null } }));
    }
  };

  const handlePickFile = (machineId) => {
    if (!fileInputsRef.current[machineId]) {
      fileInputsRef.current[machineId] = { input: null };
    }
    fileInputsRef.current[machineId].input?.click();
  };

  const openInfo = (machineId) => {
    setInfoTargetId(machineId);
    setIsInfoOpen(true);
  };

  const selectedMachine = useMemo(() => {
    if (!infoTargetId) return null;
    return machines.find(m => m._id === infoTargetId) || null;
  }, [infoTargetId, machines]);

  const selectedStatus = useMemo(() => {
    if (!infoTargetId) return null;
    return agentStatuses[infoTargetId]?.data || null;
  }, [infoTargetId, agentStatuses]);

  useEffect(() => {
    // Preseleciona primeiro MAC quando abre modal
    if (isInfoOpen) {
      const macs = selectedStatus?.macs || [];
      setSelectedMac(macs[0] || '');
    } else {
      setSelectedMac('');
    }
  }, [isInfoOpen, selectedStatus]);

  const sendWOL = async () => {
    try {
      const mac = selectedMac || (selectedStatus?.macs?.[0] || '');
      if (!mac) {
        toast.error('Nenhum MAC disponível para WOL.');
        return;
      }
      const resp = await api.post('/api/wol', { mac });
      if (!resp || resp.status >= 400) {
        throw new Error(resp?.data?.error || 'Falha ao enviar WOL');
      }
      toast.success(`WOL enviado para ${mac}`);
    } catch (e) {
      toast.error(e.message || 'Erro ao enviar WOL');
    }
  };

  const sendShutdown = async () => {
    try {
      const m = selectedMachine;
      if (!m?.agentUrl) {
        toast.error('Agent URL não definido para esta máquina.');
        return;
      }
      const res = await fetch(`${m.agentUrl}/shutdown`, { method: 'POST' });
      if (!res.ok) {
        let msg = 'Falha ao desligar';
        try { const err = await res.json(); msg = err.detail || err.message || msg; } catch {}
        throw new Error(msg);
      }
      toast.success('Comando de desligar enviado');
    } catch (e) {
      toast.error(e.message || 'Erro ao desligar máquina');
    }
  };

  // Estilo fixo padrão 'preencher' (dropdown removido)

  const handleFileSelected = async (machine, event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // validações básicas
    if (!file.type.match('image/(jpeg|jpg|png|bmp)')) {
      toast.error('Selecione uma imagem válida (JPEG, JPG, PNG, BMP)');
      return;
    }
    const MAX = 10 * 1024 * 1024;
    if (file.size > MAX) {
      toast.error('Arquivo maior que 10MB');
      return;
    }

    await uploadToAgent(machine, file, 'preencher');
    // limpa input
    event.target.value = '';
  };

  // Polling leve para manter status atualizados
  useEffect(() => {
    if (!machines?.length) return;
    const interval = setInterval(() => {
      machines.forEach((m) => fetchAgentStatus(m));
    }, 10000); // 10s
    return () => clearInterval(interval);
  }, [machines]);

  const uploadToAgent = async (machine, file, estilo) => {
    if (!machine?.agentUrl) {
      toast.error('Esta máquina não possui agentUrl');
      return;
    }
    setUploading((prev) => ({ ...prev, [machine._id]: true }));
    const toastId = toast.loading(`Enviando imagem para ${machine.name}...`);
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('estilo', estilo || 'preencher');
      const res = await fetch(`${machine.agentUrl}/alterar_papel_de_parede`, {
        method: 'POST',
        body: formData,
      });
      if (!res.ok) {
        let msg = 'Erro ao alterar papel de parede';
        try { const err = await res.json(); msg = err.detail || err.message || msg; } catch {}
        throw new Error(msg);
      }
      toast.success(`Papel de parede atualizado em ${machine.name}`, { id: toastId });
      await fetchAgentStatus(machine);
    } catch (e) {
      console.error(e);
      toast.error(e.message || 'Erro ao enviar imagem', { id: toastId });
    } finally {
      setUploading((prev) => ({ ...prev, [machine._id]: false }));
    }
  };

  const formatFileName = (statusData) => {
    const wp = statusData?.wallpaper;
    if (!wp) return '—';
    if (wp.file_name) return wp.file_name;
    if (wp.info && wp.info.startsWith('Arquivo local:')) {
      const raw = wp.info.replace('Arquivo local:', '').trim();
      const only = raw.split('\\').pop();
      return only || raw;
    }
    return '—';
  };

  useEffect(() => {
    fetchMachines();
    fetchLocations();
  }, []);

  // We now show both online and offline machines, so no filtering here.

  // Build location groups from saved locations and machine data
  const groups = (() => {
    const byName = new Map();
    const savedNames = new Set((locations || []).map(l => l.name));

    // Initialize groups for saved locations
    (locations || []).forEach(l => {
      byName.set(l.name || 'Sem nome', { name: l.name || 'Sem nome', machines: [] });
    });

    // Group machines into matching location or collect others
    const others = new Map();
    let noLocation = [];
    (machines || []).forEach(m => {
      const loc = m.location || '';
      if (!loc) {
        noLocation.push(m);
      } else if (byName.has(loc)) {
        byName.get(loc).machines.push(m);
      } else {
        // location string exists but not saved in current locations list
        if (!others.has(loc)) others.set(loc, { name: loc, machines: [] });
        others.get(loc).machines.push(m);
      }
    });

    const result = [
      ...Array.from(byName.values()),
      ...Array.from(others.values()),
    ];
    if (noLocation.length) {
      result.push({ name: 'Sem localização', machines: noLocation });
    }
    // Optional: sort groups alphabetically, keeping 'Sem localização' last
    return result.sort((a, b) => {
      if (a.name === 'Sem localização') return 1;
      if (b.name === 'Sem localização') return -1;
      return a.name.localeCompare(b.name);
    });
  })();

  const handleSaveItem = async (itemData) => {
    try {
      // Aqui você pode adicionar a lógica para salvar o novo item
      // Por exemplo: await inventoryService.addItem(itemData);
      toast.success('Item adicionado com sucesso!');
      setIsAddItemModalOpen(false);
    } catch (error) {
      console.error('Erro ao adicionar item:', error);
      toast.error('Erro ao adicionar item');
    }
  };

  return (
    <div className="container mx-auto p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-800">Wallpapers por Desktop</h1>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setIsLocationModalOpen(true)}>
            Adicionar Local
          </Button>
          <Button onClick={() => setIsAddItemModalOpen(true)}>
            Adicionar Item
          </Button>
          <Button onClick={() => setIsMachineCodeModalOpen(true)}>
            Adicionar por Código
          </Button>
        </div>
      </div>

      <LocationModal 
        isOpen={isLocationModalOpen} 
        onClose={() => { setIsLocationModalOpen(false); fetchLocations(); }} 
      />

      {/* Modal de informações ampliadas */}
      <Dialog.Root open={isInfoOpen} onOpenChange={setIsInfoOpen}>
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 bg-black/40" />
          <Dialog.Content className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[92vw] max-w-[800px] max-h-[85vh] overflow-y-auto rounded-lg bg-background p-5 shadow-lg">
            <Dialog.Title className="text-lg font-semibold">Informações da Máquina</Dialog.Title>
            <Dialog.Description className="text-sm text-muted-foreground mb-4">
              Visualização detalhada dos dados salvos e do agente (se online).
            </Dialog.Description>

            {selectedMachine ? (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <div className="text-muted-foreground">Nome</div>
                    <div className="font-medium break-words">{selectedMachine.name}</div>
                  </div>
                  <div>
                    <div className="text-muted-foreground">ID</div>
                    <div className="font-medium break-words">{selectedMachine.machineID || selectedMachine.machineId || '—'}</div>
                  </div>
                  <div>
                    <div className="text-muted-foreground">Localização</div>
                    <div className="font-medium break-words">{selectedMachine.location || '—'}</div>
                  </div>
                  <div>
                    <div className="text-muted-foreground">Status</div>
                    <div className="font-medium break-words">{selectedMachine.status}</div>
                  </div>
                  <div>
                    <div className="text-muted-foreground">Categoria</div>
                    <div className="font-medium break-words">{selectedMachine.category}</div>
                  </div>
                  <div>
                    <div className="text-muted-foreground">Agent URL</div>
                    <div className="font-medium break-words">{selectedMachine.agentUrl || '—'}</div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <div className="text-muted-foreground">Processador</div>
                    <div className="font-medium break-words">{selectedMachine.processor || selectedMachine.details?.processor || '—'}</div>
                  </div>
                  <div>
                    <div className="text-muted-foreground">RAM</div>
                    <div className="font-medium break-words">{selectedMachine.ram || selectedMachine.details?.ram || '—'}</div>
                  </div>
                  <div>
                    <div className="text-muted-foreground">Armazenamento</div>
                    <div className="font-medium break-words">{selectedMachine.storage || selectedMachine.details?.storage || '—'}</div>
                  </div>
                  <div className="col-span-2">
                    <div className="text-muted-foreground">Descrição</div>
                    <div className="font-medium break-words">{selectedMachine.description || selectedMachine.details?.description || '—'}</div>
                  </div>
                </div>

                <div className="border-t pt-4">
                  <div className="text-sm font-semibold mb-2">Informações do Agente</div>
                  {selectedStatus ? (
                    <div className="grid grid-cols-2 gap-3 text-sm">
                      <div>
                        <div className="text-muted-foreground">Desktop</div>
                        <div className="font-medium break-words">{selectedStatus.desktop || '—'}</div>
                      </div>
                      <div>
                        <div className="text-muted-foreground">IP</div>
                        <div className="font-medium break-words">{selectedStatus.ip || '—'}</div>
                      </div>
                      <div>
                        <div className="text-muted-foreground">CPU</div>
                        <div className="font-medium break-words">{selectedStatus.hardware?.cpu?.name || '—'}</div>
                      </div>
                      <div>
                        <div className="text-muted-foreground">Placa-mãe</div>
                        <div className="font-medium break-words">{selectedStatus.hardware?.motherboard?.product || '—'}</div>
                      </div>
                      <div>
                        <div className="text-muted-foreground">RAM (detectada)</div>
                        <div className="font-medium break-words">{selectedStatus.hardware?.memory?.total_gb ? `${selectedStatus.hardware.memory.total_gb} GB` : '—'}</div>
                      </div>
                      <div>
                        <div className="text-muted-foreground">Disco (detectado)</div>
                        <div className="font-medium break-words">{selectedStatus.hardware?.storage?.join(', ') || '—'}</div>
                      </div>
                      <div className="col-span-2">
                        <div className="text-muted-foreground">Wallpaper atual</div>
                        <div className="font-medium break-words">{selectedStatus.wallpaper?.file_name || selectedStatus.wallpaper?.info || '—'}</div>
                      </div>
                      <div className="col-span-2 border-t pt-3">
                        <div className="text-sm font-semibold mb-2">Energia</div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <div className="text-muted-foreground text-xs">MAC para WOL:</div>
                          <select
                            className="border rounded px-2 py-1 text-xs"
                            value={selectedMac}
                            onChange={(e) => setSelectedMac(e.target.value)}
                          >
                            {(selectedStatus.macs || []).map((mac) => (
                              <option key={mac} value={mac}>{mac}</option>
                            ))}
                          </select>
                          <Button type="button" variant="outline" size="sm" className="h-8 px-3 text-xs" onClick={sendWOL}>
                            Ligar (WOL)
                          </Button>
                          <Button type="button" variant="destructive" size="sm" className="h-8 px-3 text-xs" onClick={sendShutdown}>
                            Desligar
                          </Button>
                        </div>
                        <p className="text-[11px] text-muted-foreground mt-1">
                          Observação: o WOL é enviado pelo agente. Só funciona quando este agente está online (útil para acionar outros dispositivos na mesma rede).
                        </p>
                      </div>
                    </div>
                  ) : (
                    <div className="text-sm">
                      <div className="text-muted-foreground mb-2">Sem dados do agente ou máquina offline.</div>
                      <div className="col-span-2 border-t pt-3">
                        <div className="text-sm font-semibold mb-2">Energia</div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <div className="text-muted-foreground text-xs">MAC para WOL:</div>
                          <input
                            className="border rounded px-2 py-1 text-xs"
                            placeholder="AA:BB:CC:DD:EE:FF"
                            value={selectedMac}
                            onChange={(e) => setSelectedMac(e.target.value)}
                          />
                          <Button type="button" variant="outline" size="sm" className="h-8 px-3 text-xs" onClick={sendWOL}>
                            Ligar (WOL)
                          </Button>
                          <Button type="button" variant="destructive" size="sm" className="h-8 px-3 text-xs" disabled>
                            Desligar
                          </Button>
                        </div>
                        <p className="text-[11px] text-muted-foreground mt-1">
                          O WOL agora é enviado pelo backend. Informe o MAC mesmo com o agente offline.
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="text-sm text-muted-foreground">Nenhuma máquina selecionada.</div>
            )}

            <Dialog.Close asChild>
              <button
                className="absolute top-4 right-4 rounded-full p-1 hover:bg-accent hover:text-accent-foreground focus:outline-none"
                aria-label="Fechar"
              >
                <Cross2Icon className="h-5 w-5" />
              </button>
            </Dialog.Close>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>

      <ItemModal
        isOpen={isAddItemModalOpen}
        onClose={() => setIsAddItemModalOpen(false)}
        onSave={handleSaveItem}
      />

      <p className="text-sm text-gray-500 mb-6">Cada cartão representa um desktop com agente configurado (online ou offline).</p>

      {/* Groups by localização */}
      <div className="space-y-6">
        {groups.map((group) => (
          <div
            key={group.name}
            className="rounded-lg border focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2 focus-within:ring-offset-background"
            tabIndex={0}
          >
            <div className="px-4 py-2 border-b bg-muted/40 flex items-center justify-between">
              <h2 className="text-sm font-semibold">
                {group.name}
              </h2>
              <span className="text-xs text-muted-foreground">{group.machines.length} máquina(s)</span>
            </div>
            <div className="p-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 2xl:grid-cols-6 gap-3">
                {group.machines.map((m) => {
                  const status = agentStatuses[m._id];
                  const loading = status?.loading;
                  const data = status?.data;
                  const isOnline = data?.status === 'online';
                  const isUploading = !!uploading[m._id];
                  const img = data?.wallpaper?.image_url;
                  const desktopName = data?.desktop || m.name;
                  const fileName = formatFileName(data);

                  return (
                    <Card key={m._id} className="overflow-hidden">
                      <div className="h-28 bg-muted flex items-center justify-center">
                        {img ? (
                          <img src={img} alt={`Wallpaper ${desktopName}`} className="w-full h-full object-cover" />
                        ) : (
                          <div className="text-muted-foreground text-xs">{loading ? 'Carregando...' : 'Sem preview'}</div>
                        )}
                      </div>
                      <CardHeader className="py-2 px-3">
                        <CardTitle className="flex items-center justify-between text-sm">
                          <span className="truncate" title={desktopName}>{desktopName}</span>
                          <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${isOnline ? 'bg-green-100 text-green-700' : 'bg-gray-200 text-gray-700'}`}>
                            {isOnline ? 'Online' : 'Offline'}
                          </span>
                        </CardTitle>
                        {fileName && (
                          <div className="text-xs text-muted-foreground truncate" title={fileName}>
                            {fileName}
                          </div>
                        )}
                      </CardHeader>
                      <CardContent className="pt-0 px-3 pb-3">
                        <div className="space-y-2">
                          <div className="flex space-x-2">
                            <input
                              type="file"
                              ref={(el) => {
                                if (!fileInputsRef.current[m._id]) fileInputsRef.current[m._id] = { input: null };
                                fileInputsRef.current[m._id].input = el;
                              }}
                              onChange={(e) => handleFileSelected(m, e)}
                              accept="image/jpeg,image/jpg,image/png,image/bmp"
                              className="hidden"
                              disabled={isUploading || !isOnline}
                            />
                            <Button
                              onClick={() => handlePickFile(m._id)}
                              disabled={isUploading || !isOnline}
                              className="h-8 px-3 text-xs whitespace-nowrap rounded-md bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-60 disabled:cursor-not-allowed shadow-sm border border-primary/20 transition-colors"
                            >
                              {isUploading ? (
                                <span className="inline-flex items-center gap-1">
                                  <ReloadIcon className="h-3 w-3 animate-spin" />
                                  Enviando...
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1">
                                  <UploadIcon className="h-3 w-3" />
                                  Enviar
                                </span>
                              )}
                            </Button>
                            <Button
                              type="button"
                              variant="outline"
                              onClick={() => openInfo(m._id)}
                              className="h-8 px-2 text-xs rounded-md"
                            >
                              <span className="inline-flex items-center gap-1">
                                <GearIcon className="h-3 w-3" />
                                Config.
                              </span>
                            </Button>
                          </div>
                          {/* Detalhes salvos no cadastro (compacto, sem Agent URL) */}
                          <div className="mt-2 rounded-md border bg-muted/40 p-2 text-xs">
                            <div className="grid grid-cols-[auto,1fr] gap-x-2 gap-y-1 items-start">
                              { (m.machineID || m.machineId) && (
                                <>
                                  <div className="text-muted-foreground">ID:</div>
                                  <div className="font-medium truncate" title={m.machineID || m.machineId}>{m.machineID || m.machineId}</div>
                                </>
                              )}
                              { (m.processor || m.details?.processor) && (
                                <>
                                  <div className="text-muted-foreground">Processador:</div>
                                  <div className="font-medium truncate" title={m.processor || m.details?.processor}>{m.processor || m.details?.processor}</div>
                                </>
                              )}
                              { (m.ram || m.details?.ram) && (
                                <>
                                  <div className="text-muted-foreground">RAM:</div>
                                  <div className="font-medium truncate" title={m.ram || m.details?.ram}>{m.ram || m.details?.ram}</div>
                                </>
                              )}
                              { (m.storage || m.details?.storage) && (
                                <>
                                  <div className="text-muted-foreground">Armazenamento:</div>
                                  <div className="font-medium truncate" title={m.storage || m.details?.storage}>{m.storage || m.details?.storage}</div>
                                </>
                              )}
                              { (m.description || m.details?.description) && (
                                <>
                                  <div className="text-muted-foreground">Descrição:</div>
                                  <div className="font-medium truncate" title={m.description || m.details?.description}>{m.description || m.details?.description}</div>
                                </>
                              )}
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
              {group.machines.length === 0 && (
                <div className="text-sm text-muted-foreground text-center py-6">Nenhuma máquina neste local.</div>
              )}
            </div>
          </div>
        ))}
      </div>
      {machines.length === 0 && (
        <div className="mt-8 text-sm text-gray-700">
          <div className="text-center">
            Nenhuma máquina online encontrada. Verifique se o agente está em execução e se o campo agentUrl aponta para http://IP-DA-MAQUINA:8002.
          </div>
        </div>
      )}

      <MachineCodeModal
        isOpen={isMachineCodeModalOpen}
        onClose={() => setIsMachineCodeModalOpen(false)}
        onSaved={async (created) => {
          // Otimista: adiciona imediatamente enquanto recarrega do backend
          if (created) {
            setMachines((prev) => Array.isArray(prev) ? [...prev, created] : [created]);
          }
          try {
            await Promise.all([fetchMachines(), fetchLocations()]);
            toast.success('Máquina adicionada!');
          } catch (e) {
            // handled em fetchers
          }
        }}
      />
    </div>
  );
}