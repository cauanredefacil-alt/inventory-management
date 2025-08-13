import { useState, useEffect, useRef } from 'react';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { toast } from 'sonner';
import machineService from '../services/machineService';

export default function WallpaperManager() {
  const [machines, setMachines] = useState([]);
  const [agentStatuses, setAgentStatuses] = useState({}); // { machineId: { loading, error, data } }
  const [uploading, setUploading] = useState({}); // { machineId: boolean }
  const fileInputsRef = useRef({}); // { machineId: inputRef }

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
  }, []);

  const filteredMachines = machines.filter((m) => {
    const status = agentStatuses[m._id];
    return status?.data?.status === 'online';
  });

  return (
    <div className="container mx-auto p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-800">Wallpapers por Desktop</h1>
        <p className="text-sm text-gray-500">Cada cartão representa um desktop conectado com agente configurado.</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {filteredMachines
          .map((m) => {
          const status = agentStatuses[m._id];
          const loading = status?.loading;
          const data = status?.data;
          const error = status?.error;
          const isUploading = !!uploading[m._id];
          const img = data?.wallpaper?.image_url;
          const desktopName = data?.desktop || m.name;
          return (
            <Card key={m._id} className="overflow-hidden">
              <div className="aspect-video bg-gray-100 flex items-center justify-center">
                {img ? (
                  <img src={img} alt={`Wallpaper ${desktopName}`} className="w-full h-full object-cover" />
                ) : (
                  <div className="text-gray-400 text-sm">{loading ? 'Carregando...' : 'Sem preview'}</div>
                )}
              </div>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span className="truncate" title={desktopName}>{desktopName}</span>
                  <span className={`text-xs px-2 py-0.5 rounded-full ${error ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}`}>
                    {error ? 'Offline' : 'Online'}
                  </span>
                </CardTitle>
                <CardDescription className="text-xs">
                  Arquivo: {data ? formatFileName(data) : '—'}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-2">
                  <Button
                    disabled={!m.agentUrl || isUploading}
                    onClick={() => handlePickFile(m._id)}
                    className="flex-1"
                  >
                    {isUploading ? 'Enviando...' : 'Trocar imagem'}
                  </Button>
                  <Button
                    variant="secondary"
                    disabled={loading}
                    onClick={() => fetchAgentStatus(m)}
                  >
                    Atualizar
                  </Button>
                  <input
                    type="file"
                    accept="image/jpeg,image/png,image/bmp"
                    ref={(el) => {
                      if (!fileInputsRef.current[m._id]) fileInputsRef.current[m._id] = { input: null, style: 'preencher' };
                      fileInputsRef.current[m._id].input = el;
                    }}
                    onChange={(e) => handleFileSelected(m, e)}
                    className="hidden"
                  />
                </div>
                <div className="mt-3">
                  <label className="text-xs text-gray-600">Estilo:</label>
                  <select
                    className="ml-2 text-sm border rounded px-2 py-1"
                    defaultValue="preencher"
                    onChange={(e) => handleStyleChange(m._id, e.target.value)}
                  >
                    {styles.map((s) => (
                      <option key={s.value} value={s.value}>{s.label}</option>
                    ))}
                  </select>
                </div>
                {!m.agentUrl && (
                  <p className="mt-2 text-xs text-amber-600">Defina agentUrl nesta máquina para habilitar o controle.</p>
                )}
                {error && (
                  <p className="mt-2 text-xs text-red-600">{error}</p>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>
      {filteredMachines.length === 0 && (
        <div className="mt-8 text-sm text-gray-700">
          <div className="text-center">
            Nenhuma máquina online encontrada. Verifique se o agente está em execução e se o campo agentUrl aponta para http://IP-DA-MAQUINA:8002.
          </div>
          {machines?.length > 0 && (
            <div className="mt-4">
              <div className="font-medium text-gray-800 mb-2">Diagnóstico rápido</div>
              <ul className="space-y-1">
                {machines.map((m) => {
                  const st = agentStatuses[m._id];
                  const statusTxt = st?.data?.status || (st?.error ? `Erro: ${st.error}` : 'Sem status');
                  return (
                    <li key={m._id} className="flex items-center justify-between border rounded px-3 py-2">
                      <span className="truncate" title={m.name}>{m.name}</span>
                      <span className="text-xs text-gray-600">
                        agentUrl: {m.agentUrl ? <span className="text-green-700">definido</span> : <span className="text-red-700">não definido</span>} | {statusTxt}
                      </span>
                    </li>
                  );
                })}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
}