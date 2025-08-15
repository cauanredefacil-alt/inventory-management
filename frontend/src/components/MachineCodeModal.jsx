import React, { useEffect, useState } from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import { Cross2Icon } from '@radix-ui/react-icons';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import api from '../services/apiService';
import machineService from '../services/machineService';

const MachineCodeModal = ({ isOpen, onClose, onSaved }) => {
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [agentInfo, setAgentInfo] = useState(null); // dados retornados de /obter_status
  const [agentUrl, setAgentUrl] = useState(''); // fallback manual
  const [locations, setLocations] = useState([]);
  const [location, setLocation] = useState('');
  const [status, setStatus] = useState('available');
  const [machineId, setMachineId] = useState(''); // opcional, diferente do código

  // Lista vinda do backend (/api/locations) passa a ser a fonte de verdade

  useEffect(() => {
    if (!isOpen) {
      setCode('');
      setLoading(false);
      setError('');
      setAgentInfo(null);
      setAgentUrl('');
      setLocation('');
      setLocations([]);
      setMachineId('');
      setStatus('available');
    }
  }, [isOpen]);

  useEffect(() => {
    const loadLocations = async () => {
      try {
        const resp = await api.get('/api/locations');
        setLocations(Array.isArray(resp.data) ? resp.data : []);
      } catch {
        setLocations([]);
      }
    };
    if (isOpen) loadLocations();
  }, [isOpen]);

  // Se a localização selecionada não existir mais na lista carregada, limpa
  useEffect(() => {
    if (!isOpen) return;
    if (location && !(locations || []).some(l => l?.name === location)) {
      setLocation('');
    }
  }, [isOpen, location, locations]);

  // Normaliza o endereço informado (ex.: "192.168.50.8" -> "http://192.168.50.8:8002")
  const normalizeAgentUrl = (value) => {
    if (!value) return '';
    let v = String(value).trim();
    if (!/^https?:\/\//i.test(v)) {
      v = `http://${v}`;
    }
    try {
      const u = new URL(v);
      // Se não tiver porta, assume 8002
      if (!u.port) {
        u.port = '8002';
      }
      // Garante que não haja path extra
      u.pathname = '';
      u.search = '';
      u.hash = '';
      return u.toString().replace(/\/$/, '');
    } catch {
      return v.replace(/\/$/, '');
    }
  };

  const fetchAgentStatus = async (url) => {
    const clean = url.replace(/\/$/, '');
    const resp = await fetch(`${clean}/obter_status`);
    if (!resp.ok) {
      let msg = 'Falha ao obter status do agente';
      try { const t = await resp.text(); if (t?.startsWith('<!DOCTYPE')) msg = 'O endereço informado não retornou JSON (verifique o protocolo/porta)'; } catch {}
      throw new Error(msg);
    }
    try {
      const data = await resp.json();
      return data;
    } catch (e) {
      throw new Error('Resposta inválida do agente (não é JSON). Verifique o endereço e a porta.');
    }
  };

  const handleFindByCode = async (e) => {
    e?.preventDefault();
    setError('');
    if (!code || !/^\d{5}$/.test(code)) {
      setError('Informe o código de 5 dígitos');
      return;
    }
    setLoading(true);
    try {
      // 1) Tenta resolver pelo backend (se houver rota habilitada)
      let resolvedUrl = '';
      try {
        const res = await api.get('/api/agents/by-code', { params: { code } });
        resolvedUrl = res?.data?.agentUrl || res?.data?.agent_url || '';
      } catch (e) {
        // Ignora e tenta fallback manual
        resolvedUrl = '';
      }

      let statusData = null;
      if (resolvedUrl) {
        statusData = await fetchAgentStatus(resolvedUrl);
      } else {
        // 2) Fallback: pedir URL manual do agente
        setError('Não consegui resolver o endereço do agente pelo código. Informe o endereço abaixo (ex: http://IP:8002) e clique em "Buscar".');
        return;
      }

      setAgentUrl(statusData?.agent_url || statusData?.agentUrl || resolvedUrl);
      setAgentInfo(statusData);
    } catch (e) {
      setError(e.message || 'Erro ao buscar agente');
    } finally {
      setLoading(false);
    }
  };

  const handleFetchByUrl = async () => {
    setError('');
    if (!agentUrl) {
      setError('Informe o endereço do agente');
      return;
    }
    setLoading(true);
    try {
      const normalized = normalizeAgentUrl(agentUrl);
      const data = await fetchAgentStatus(normalized);
      setAgentUrl(data?.agent_url || data?.agentUrl || normalized);
      setAgentInfo(data);
    } catch (e) {
      setError(e.message || 'Erro ao buscar status');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveMachine = async () => {
    if (!agentInfo) return;
    try {
      const name = agentInfo?.desktop || 'Máquina sem nome';
      // Validação: só envia se existir na lista carregada ou se for string não vazia (backend agora aceita qualquer string)
      const loc = (location || '').trim();
      const existsInList = (locations || []).some(l => l?.name === loc);
      const locationToSend = loc ? loc : undefined;
      const cleanCpuName = (s) => {
        if (!s) return '';
        // Remove sufixos de frequência, ex: " @ 3.20GHz"
        return String(s).replace(/\s*@.*$/i, '').trim();
      };
      const toNumber = (v) => {
        const n = Number(v);
        return Number.isFinite(n) ? n : undefined;
      };
      // Converte para os enums exatamente disponíveis nos dropdowns do ItemModal
      // RAM: 4GB, 6GB, 8GB, 16GB, 32GB
      const RAM_ENUMS = [4, 6, 8, 16, 32];
      const toRamEnum = (gb) => {
        if (!Number.isFinite(gb)) return '';
        const closest = RAM_ENUMS.reduce((best, cur) => {
          if (best === null) return cur;
          return Math.abs(cur - gb) < Math.abs(best - gb) ? cur : best;
        }, null);
        return closest ? `${closest}GB` : '';
      };
      // STORAGE: 120GB SSD/HD, 240GB SSD/HD, 480GB SSD/HD, 1TB SSD/HD
      const STORAGE_ENUMS_GB = [120, 240, 480, 1024];
      const toStorageEnum = (gb) => {
        if (!Number.isFinite(gb)) return '';
        const closest = STORAGE_ENUMS_GB.reduce((best, cur) => {
          if (best === null) return cur;
          return Math.abs(cur - gb) < Math.abs(best - gb) ? cur : best;
        }, null);
        if (!closest) return '';
        const label = closest >= 1024 ? '1TB' : `${closest}GB`;
        // Default para SSD (não temos como detectar HDD/SSD via agente)
        return `${label} SSD`;
      };
      const ramGb = toNumber(agentInfo?.hardware?.ram_total_gb);
      const storageGb = toNumber(agentInfo?.hardware?.storage_total_gb);
      const ramEnum = toRamEnum(ramGb);
      const storageEnum = toStorageEnum(storageGb);
      const payload = {
        name,
        type: 'machine',
        status,
        location: locationToSend,
        agentUrl: agentInfo?.agent_url || agentInfo?.agentUrl || agentUrl,
        machineId: machineId || undefined, // não usar o código como machineId
        processor: cleanCpuName(agentInfo?.hardware?.cpu?.name) || agentInfo?.hardware?.motherboard?.product || '',
        ram: ramEnum || undefined,
        storage: storageEnum || undefined,
        // Persistimos o Código no início da descrição para exibir nos cards
        description: `IP: ${agentInfo?.ip || ''}`
      };
      const created = await machineService.createMachine(payload);
      onSaved?.(created);
      onClose?.();
    } catch (e) {
      setError(e?.response?.data?.error || e.message || 'Erro ao salvar máquina');
    }
  };

  return (
    <Dialog.Root open={isOpen} onOpenChange={(open) => { if (!open) onClose?.(); }}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-black/50" />
        <Dialog.Content className="fixed left-1/2 top-1/2 w-[90vw] max-w-[600px] max-h-[85vh] -translate-x-1/2 -translate-y-1/2 rounded-md border bg-background text-foreground p-6 shadow-lg focus:outline-none overflow-y-auto">
          <Dialog.Title className="text-lg font-semibold">Adicionar Máquina por Código</Dialog.Title>
          <Dialog.Description className="mt-1 text-sm text-muted-foreground">
            Informe o código de 5 dígitos da máquina para localizar o agente e confirmar as informações.
          </Dialog.Description>

          <form onSubmit={handleFindByCode} className="mt-4 space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium leading-none">Código da máquina</label>
              <Input
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/[^0-9]/g, '').slice(0, 5))}
                placeholder="Ex: 12345"
                maxLength={5}
              />
            </div>

            {!agentInfo && (
              <div className="flex items-center gap-2">
                <Button type="submit" disabled={loading}>
                  {loading ? 'Buscando...' : 'Buscar por código'}
                </Button>
                <span className="text-xs text-muted-foreground">ou informe o endereço do agente manualmente abaixo</span>
              </div>
            )}
          </form>

          {!agentInfo && (
            <div className="mt-4 space-y-2">
              <label className="text-sm font-medium leading-none">Endereço do agente (opcional)</label>
              <div className="flex gap-2">
                <Input
                  value={agentUrl}
                  onChange={(e) => setAgentUrl(e.target.value)}
                  placeholder="http://IP-DA-MAQUINA:8002"
                />
                <Button variant="outline" onClick={handleFetchByUrl} disabled={loading}>
                  {loading ? 'Buscando...' : 'Buscar'}
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">Se o backend não tiver a rota de lookup por código, você pode informar o endereço manualmente.</p>
            </div>
          )}

          {!!error && (
            <div className="mt-3 text-sm text-red-500">{error}</div>
          )}

          {agentInfo && (
            <div className="mt-6 space-y-4">
              <div className="rounded-md border p-3 bg-muted">
                <div className="text-sm font-medium mb-2">Informações detectadas</div>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div><span className="text-muted-foreground">Nome do dispositivo:</span> {agentInfo.desktop || '—'}</div>
                  <div><span className="text-muted-foreground">Código:</span> {agentInfo.machine_code || code}</div>
                  <div><span className="text-muted-foreground">IP:</span> {agentInfo.ip || '—'}</div>
                  <div><span className="text-muted-foreground">Agent URL:</span> {agentInfo.agent_url || agentInfo.agentUrl || agentUrl || '—'}</div>
                  <div className="col-span-2"><span className="text-muted-foreground">Processador:</span> {agentInfo?.hardware?.cpu?.name || '—'}</div>
                  <div className="col-span-2"><span className="text-muted-foreground">RAM total:</span> {agentInfo?.hardware?.ram_total_gb ? `${agentInfo.hardware.ram_total_gb} GB` : '—'}</div>
                  <div className="col-span-2"><span className="text-muted-foreground">Armazenamento total:</span> {agentInfo?.hardware?.storage_total_gb ? `${agentInfo.hardware.storage_total_gb} GB` : '—'}</div>
                  <div className="col-span-2"><span className="text-muted-foreground">Placa-mãe:</span> {agentInfo?.hardware?.motherboard?.product || agentInfo?.hardware?.motherboard?.manufacturer || '—'}</div>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium leading-none">Localização</label>
                <Select value={location} onValueChange={(v) => setLocation(v)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione a localização" />
                  </SelectTrigger>
                  <SelectContent>
                    {(locations || []).map((l) => (
                      <SelectItem key={l._id || l.name} value={l.name}>{l.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">Você pode adicionar novas localizações no botão "Adicionar Local".</p>
              </div>

              {/* Status */}
              <div className="space-y-2">
                <label className="text-sm font-medium leading-none">Status</label>
                <Select value={status} onValueChange={(v) => setStatus(v)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione o status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="available">Disponível</SelectItem>
                    <SelectItem value="in-use">Em uso</SelectItem>
                    <SelectItem value="maintenance">Em manutenção</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* ID da máquina (opcional) */}
              <div className="space-y-2">
                <label className="text-sm font-medium leading-none">ID da máquina (opcional)</label>
                <Input
                  value={machineId}
                  onChange={(e) => setMachineId(e.target.value)}
                  placeholder="Ex: PC-001"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <Button variant="outline" onClick={onClose}>Cancelar</Button>
                <Button onClick={handleSaveMachine} disabled={loading || !agentInfo}>Salvar Máquina</Button>
              </div>
            </div>
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
  );
};

export default MachineCodeModal;
