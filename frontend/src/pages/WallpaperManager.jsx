import { useState, useEffect, useRef } from 'react';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { toast } from 'sonner';
import machineService from '../services/machineService';
import ItemModal from '../components/ItemModal';
import LocationModal from '../components/LocationModal';
import api from '../services/apiService';
import MachineCodeModal from '../components/MachineCodeModal';

export default function WallpaperManager() {
  const [machines, setMachines] = useState([]);
  const [agentStatuses, setAgentStatuses] = useState({}); // { machineId: { loading, error, data } }
  const [uploading, setUploading] = useState({}); // { machineId: boolean }
  const fileInputsRef = useRef({}); // { machineId: inputRef }
  const [isAddItemModalOpen, setIsAddItemModalOpen] = useState(false);
  const [isLocationModalOpen, setIsLocationModalOpen] = useState(false);
  const [locations, setLocations] = useState([]); // saved locations from LocationModal
  const [isMachineCodeModalOpen, setIsMachineCodeModalOpen] = useState(false);

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
      fileInputsRef.current[machineId] = { input: null, style: 'preencher' };
    }
    fileInputsRef.current[machineId].input?.click();
  };

  const handleStyleChange = (machineId, value) => {
    if (!fileInputsRef.current[machineId]) fileInputsRef.current[machineId] = { input: null, style: 'preencher' };
    fileInputsRef.current[machineId].style = value;
  };

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

    await uploadToAgent(machine, file, fileInputsRef.current[machine._id]?.style || 'preencher');
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
                            <select
                              className="flex-1 p-1 border rounded text-xs"
                              value={fileInputsRef.current[m._id]?.style || 'preencher'}
                              onChange={(e) => handleStyleChange(m._id, e.target.value)}
                              disabled={isUploading || !isOnline}
                            >
                              {styles.map((style) => (
                                <option key={style.value} value={style.value}>
                                  {style.label}
                                </option>
                              ))}
                            </select>
                            <input
                              type="file"
                              ref={(el) => {
                                if (!fileInputsRef.current[m._id]) fileInputsRef.current[m._id] = { input: null, style: 'preencher' };
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
                              className="h-8 px-2 text-xs whitespace-nowrap"
                            >
                              {isUploading ? 'Enviando...' : 'Enviar'}
                            </Button>
                          </div>
                          {/* Detalhes salvos no cadastro */}
                          <div className="mt-2 rounded-md border bg-muted/40 p-2 text-xs">
                            <div className="grid grid-cols-2 gap-1">
                              { (m.machineID || m.machineId) && (
                                <div><span className="text-muted-foreground">Código:</span> {m.machineID || m.machineId}</div>
                              )}
                              { (m.processor || m.details?.processor) && (
                                <div><span className="text-muted-foreground">Processador:</span> {m.processor || m.details?.processor}</div>
                              )}
                              { (m.ram || m.details?.ram) && (
                                <div><span className="text-muted-foreground">RAM:</span> {m.ram || m.details?.ram}</div>
                              )}
                              { (m.storage || m.details?.storage) && (
                                <div><span className="text-muted-foreground">Armazenamento:</span> {m.storage || m.details?.storage}</div>
                              )}
                              { (m.description || m.details?.description) && (
                                <div className="col-span-2 truncate" title={m.description || m.details?.description}>
                                  <span className="text-muted-foreground">Descrição:</span> {m.description || m.details?.description}
                                </div>
                              )}
                              { m.agentUrl && (
                                <div className="col-span-2 truncate" title={m.agentUrl}>
                                  <span className="text-muted-foreground">Agent URL:</span> {m.agentUrl}
                                </div>
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
        onSaved={async () => {
          try {
            await fetchMachines();
            toast.success('Máquina adicionada!');
          } catch (e) {
            // handled in fetchMachines
          }
        }}
      />
    </div>
  );
}