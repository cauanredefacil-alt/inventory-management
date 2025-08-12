import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Button } from './ui/button';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Input } from './ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import DashboardCard from './DashboardCard';
import { Package, CheckCircle2, Clock3, BatteryCharging, Search } from 'lucide-react';
import AddChipModal from './phone/AddChipModal';
import AddTelModal from './phone/AddTelModal';
import phoneService from '../services/phoneService';

const initialChips = [];
const initialTels = [];

const PhonePage = () => {
  const [activeList, setActiveList] = useState('chips'); // 'chips' | 'tels'
  const [chips, setChips] = useState(initialChips);
  const [tels, setTels] = useState(initialTels);
  const [isAddChipOpen, setIsAddChipOpen] = useState(false);
  const [isAddTelOpen, setIsAddTelOpen] = useState(false);
  const [editingTel, setEditingTel] = useState(null);
  const [editingChip, setEditingChip] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [qrModal, setQrModal] = useState({ open: false, number: '', sessionCode: '', url: '' });
  const qrPollRef = useRef(null);
  const telAutoRef = useRef(null);
  const [toast, setToast] = useState('');
  
  // Format number
  const formatBRMobile = (value) => {
    const digits = String(value || '').replace(/\D/g, '').slice(0, 11);
    const ddd = digits.slice(0, 2);
    let rest = digits.slice(2);
    if (!ddd) return '';
    let mid = '';
    if (rest.length > 0) {
      if (rest[0] === '9') {
        mid = ' 9 ' + rest.slice(1);
      } else {
        mid = ' ' + rest;
      }
    }
    return `(${ddd})${mid}`.trim();
  };
  
  // Search and filter states
  const [searchTerm, setSearchTerm] = useState('');
  const [carrierFilter, setCarrierFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');

  // Shared loader for initial load and manual refresh
  const load = async () => {
    try {
      setLoading(true);
      setError('');
      const [chipsResp, telsResp] = await Promise.all([
        phoneService.getAllChips(),
        phoneService.getAllTelSystems(),
      ]);
      setChips(chipsResp || []);
      setTels(telsResp || []);
    } catch (e) {
      console.error('Erro ao carregar dados de telefone', e);
      setError('Erro ao carregar dados de telefone');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  // Auto-refresh Tel Sistemas list to avoid manual clicks
  useEffect(() => {
    // Clear any previous interval
    if (telAutoRef.current) {
      clearInterval(telAutoRef.current);
      telAutoRef.current = null;
    }
    // Only refresh when Tel tab is active and QR modal is not open
    if (activeList !== 'tels' || qrModal.open) return;

    telAutoRef.current = setInterval(async () => {
      try {
        const updated = await phoneService.getAllTelSystems();
        setTels(updated || []);
      } catch (_) {
        // ignore errors during background refresh
      }
    }, 5000);

    return () => {
      if (telAutoRef.current) {
        clearInterval(telAutoRef.current);
        telAutoRef.current = null;
      }
    };
  }, [activeList, qrModal.open]);

  // Get unique carriers for filter dropdown
  const carriers = useMemo(() => {
    const set = new Set();
    chips.forEach(chip => { if (chip.carrier) set.add(chip.carrier); });
    return Array.from(set).sort();
  }, [chips]);

  // Group tels by number and type; also capture battery/session for number-only documents
  const groupedTels = useMemo(() => {
    const groups = {};
    tels.forEach((tel) => {
      const numberKey = String(tel.number ?? '').trim();
      if (!numberKey) return; // skip invalid
      if (!groups[numberKey]) {
        groups[numberKey] = { number: numberKey, types: {}, batteryLevel: undefined, batteryUpdatedAt: undefined, sessionCode: undefined };
      }
      const typeKey = (tel.type ?? '').trim();
      if (typeKey) {
        groups[numberKey].types[typeKey] = tel.consultant?.trim() || '';
      } else {
        // number-only record may carry battery/session metadata
        if (typeof tel.batteryLevel === 'number') groups[numberKey].batteryLevel = tel.batteryLevel;
        if (tel.batteryUpdatedAt) groups[numberKey].batteryUpdatedAt = tel.batteryUpdatedAt;
        if (tel.sessionCode) groups[numberKey].sessionCode = tel.sessionCode;
        if (tel.pairedAt) groups[numberKey].pairedAt = tel.pairedAt;
      }
    });
    return Object.values(groups).sort((a, b) => {
      const an = parseInt(a.number.replace(/\D/g, ''), 10);
      const bn = parseInt(b.number.replace(/\D/g, ''), 10);
      if (!Number.isNaN(an) && !Number.isNaN(bn)) return an - bn;
      return a.number.localeCompare(b.number);
    });
  }, [tels]);

  // Filter chips based on search and filters
  const filteredChips = useMemo(() => {
    return chips.filter(chip => {
      // Search term filter (case insensitive)
      const searchLower = searchTerm.toLowerCase();
      const matchesSearch = 
        (chip.ip && chip.ip.toString().toLowerCase().includes(searchLower)) ||
        (chip.number && chip.number.toString().toLowerCase().includes(searchLower)) ||
        (chip.carrier && chip.carrier.toLowerCase().includes(searchLower)) ||
        (chip.consultant && chip.consultant.toLowerCase().includes(searchLower));
      
      // Carrier filter
      const matchesCarrier = carrierFilter === 'all' || chip.carrier === carrierFilter;
      
      // Status filter
      const matchesStatus = statusFilter === 'all' || chip.status === statusFilter;
      
      return matchesSearch && matchesCarrier && matchesStatus;
    });
  }, [chips, searchTerm, carrierFilter, statusFilter]);

  // Update stats based on filtered chips
  const chipStats = useMemo(() => {
    const total = filteredChips.length;
    const ativos = filteredChips.filter((c) => c.status?.toLowerCase().startsWith('ativo')).length;
    const aguardando = filteredChips.filter((c) => c.status === 'Aguardando Análise').length;
    const recarga = filteredChips.filter((c) => c.status === 'Recarga Pendente').length;
    return { total, ativos, aguardando, recarga };
  }, [filteredChips]);

  const addChip = async (chip) => {
    try {
      let updatedChips;
      if (chip._id) {
        const updated = await phoneService.updateChip(chip._id, chip);
        updatedChips = chips.map(c => c._id === updated._id ? updated : c);
        setEditingChip(null);
      } else {
        const created = await phoneService.createChip(chip);
        updatedChips = [created, ...chips];
      }
      setChips(updatedChips);
      return true;
    } catch (e) {
      console.error('Erro ao salvar chip', e);
      setError(e?.response?.data?.error || `Erro ao ${chip._id ? 'atualizar' : 'criar'} chip`);
      return false;
    }
  };

  const handleEditChip = (chip) => {
    setEditingChip(chip);
    setIsAddChipOpen(true);
  };

  const handleAddChip = () => {
    setEditingChip(null);
    setIsAddChipOpen(true);
  };

  const handleChipSubmit = async (chip) => {
    const success = await addChip(chip);
    if (success) {
      setIsAddChipOpen(false);
    }
  };

  const handleDeleteChip = async (chip) => {
    const ok = window.confirm(`Tem certeza que deseja excluir o chip ${chip?.number || ''}?`);
    if (!ok) return;
    try {
      await phoneService.deleteChip(chip._id);
      setChips(prev => prev.filter(c => c._id !== chip._id));
    } catch (e) {
      console.error('Erro ao excluir chip', e);
      setError(e?.response?.data?.error || 'Erro ao excluir chip');
    }
  };

  const saveTel = async (tel) => {
    try {
      let updatedTel;
      if (tel._id) {
        // Normal update by id
        updatedTel = await phoneService.updateTelSystem(tel._id, tel);
        setTels(prev => prev.map(t => t._id === updatedTel._id ? updatedTel : t));
      } else if (tel.number && tel.type) {
        // Upsert by number+type to avoid duplicates when assigning consultant via table cell
        const existing = tels.find(t => t.number === tel.number && t.type === tel.type);
        if (existing) {
          const payload = { ...existing, consultant: tel.consultant };
          updatedTel = await phoneService.updateTelSystem(existing._id, payload);
          setTels(prev => prev.map(t => t._id === existing._id ? updatedTel : t));
        } else {
          updatedTel = await phoneService.createTelSystem(tel);
          setTels(prev => [updatedTel, ...prev]);
        }
      } else {
        // Create number-only entry
        updatedTel = await phoneService.createTelSystem({ number: tel.number });
        setTels(prev => [updatedTel, ...prev]);
      }
      return updatedTel;
    } catch (e) {
      console.error('Erro ao salvar Tel Sistema', e);
      setError(e?.response?.data?.error || `Erro ao ${tel._id ? 'atualizar' : 'criar'} Tel Sistema`);
      throw e;
    }
  };

  const deleteTel = async (id) => {
    if (!window.confirm('Tem certeza que deseja excluir este telefone?')) return;
    
    try {
      await phoneService.deleteTelSystem(id);
      setTels(prev => prev.filter(t => t._id !== id));
    } catch (e) {
      console.error('Erro ao excluir Tel Sistema', e);
      setError(e?.response?.data?.error || 'Erro ao excluir Tel Sistema');
    }
  };

  const handleEditTel = (tel) => {
    setEditingTel({
      _id: tel._id,
      number: tel.number,
      type: tel.type,
      consultant: tel.consultant
    });
    setIsAddTelOpen(true);
  };

  // Handle edit for a specific type of a phone number
  const handleEditTelType = (number, type, currentConsultant = '') => {
    setEditingTel({
      number,
      type,
      consultant: currentConsultant
    });
    setIsAddTelOpen(true);
  };

  const handleAddTel = () => {
    setEditingTel(null);
    setIsAddTelOpen(true);
  };

  const handleTelSubmit = async (tel) => {
    try {
      await saveTel(tel);
      setIsAddTelOpen(false);
    } catch (e) {
      // Error is already set in saveTel
    }
  };

  // Generate a session and open a QR image for pairing
  const handleGenerateTelQR = async (number) => {
    try {
      const { sessionCode } = await phoneService.createTelSession({ number });
      // Encode only the sessionCode so the mobile app can extract it directly
      const data = encodeURIComponent(sessionCode);
      const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=240x240&data=${data}`;
      setQrModal({ open: true, number, sessionCode, url: qrUrl });

      // Start short polling to detect pairing (up to 60s)
      if (qrPollRef.current) {
        clearInterval(qrPollRef.current);
        qrPollRef.current = null;
      }
      const startedAt = Date.now();
      qrPollRef.current = setInterval(async () => {
        try {
          const updated = await phoneService.getAllTelSystems();
          setTels(updated || []);
          const pairedDoc = (updated || []).find(
            (t) => t.number === number && !t.type && t.pairedAt
          );
          if (pairedDoc && new Date(pairedDoc.pairedAt).getTime() > startedAt) {
            clearInterval(qrPollRef.current);
            qrPollRef.current = null;
            // Auto close modal and show toast
            setQrModal({ open: false, number: '', sessionCode: '', url: '' });
            setToast('Pareado com sucesso');
            setTimeout(() => setToast(''), 3000);
          }
          if (Date.now() - startedAt > 60000) {
            clearInterval(qrPollRef.current);
            qrPollRef.current = null;
          }
        } catch (_) {
          // ignore polling errors
        }
      }, 2000);
    } catch (e) {
      console.error('Erro ao gerar sessão/QR', e);
      setError(e?.response?.data?.error || 'Erro ao gerar QR');
    }
  };

  // Clear polling on unmount
  useEffect(() => {
    return () => {
      if (qrPollRef.current) {
        clearInterval(qrPollRef.current);
        qrPollRef.current = null;
      }
    };
  }, []);

  return (
    <div className="space-y-8">
      {/* Switch de listas */}
      <div className="flex items-center justify-between">
        <div className="inline-flex rounded-md border border-border p-1 bg-muted/50">
          <button
            className={`px-3 py-1.5 rounded-md text-sm ${activeList === 'chips' ? 'bg-background shadow-card' : 'text-muted-foreground'}`}
            onClick={() => setActiveList('chips')}
          >
            Chips
          </button>
          <button
            className={`px-3 py-1.5 rounded-md text-sm ${activeList === 'tels' ? 'bg-background shadow-card' : 'text-muted-foreground'}`}
            onClick={() => setActiveList('tels')}
          >
            Tel Sistemas
          </button>
        </div>

        <div className="flex items-center gap-2">
          {activeList === 'chips' ? (
            <Button className="bg-primary text-primary-foreground hover:bg-primary/90" onClick={handleAddChip}>
              Adicionar Chip
            </Button>
          ) : (
            <Button className="bg-primary text-primary-foreground hover:bg-primary/90" onClick={handleAddTel}>
              Adicionar Tel
            </Button>
          )}
          {activeList === 'tels' && (
            <Button variant="outline" onClick={load}>
              Atualizar
            </Button>
          )}
        </div>
      </div>



      {activeList === 'chips' && (
        <>
          {error && (
            <div className="text-sm text-red-600">{error}</div>
          )}
          {/* Cards de estatísticas */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
            <DashboardCard title="Total de Chips" value={chipStats.total} icon={Package} color="primary" />
            <DashboardCard title="Chips Ativos" value={chipStats.ativos} icon={CheckCircle2} color="primary" />
            <DashboardCard title="Aguardando Análise" value={chipStats.aguardando} icon={Clock3} color="secondary" />
            <DashboardCard title="Recarga Pendente" value={chipStats.recarga} icon={BatteryCharging} color="warning" />
          </div>
          
          {/* Filtros */}
          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="text-lg">Filtros</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col sm:flex-row gap-4">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Buscar por IP, número, operadora ou status..."
                    className="pl-10"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </div>
                
                <Select value={carrierFilter} onValueChange={setCarrierFilter}>
                  <SelectTrigger className="w-[180px]">
                    <SelectValue placeholder="Operadora" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todas as operadoras</SelectItem>
                    {carriers.map(carrier => (
                      <SelectItem key={carrier} value={carrier}>
                        {carrier}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-[200px]">
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos os status</SelectItem>
                    <SelectItem value="Ativo">Ativo</SelectItem>
                    <SelectItem value="Disponível">Disponível</SelectItem>
                    <SelectItem value="Ativo/Aracaju">Ativo/Aracaju</SelectItem>
                    <SelectItem value="Aguardando Análise">Aguardando Análise</SelectItem>
                    <SelectItem value="Banido">Banido</SelectItem>
                    <SelectItem value="Inativo">Inativo</SelectItem>
                    <SelectItem value="Maturado">Maturado</SelectItem>
                    <SelectItem value="Recarga Pendente">Recarga Pendente</SelectItem>
                  </SelectContent>
                </Select>
                
                <Button 
                  variant="outline" 
                  className="px-3"
                  onClick={() => {
                    setSearchTerm('');
                    setCarrierFilter('all');
                    setStatusFilter('all');
                  }}
                  aria-label="Limpar filtros"
                  title="Limpar filtros"
                >
                  X
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Tabela de chips */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Chips</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="hidden md:grid grid-cols-12 gap-4 px-4 py-2 bg-muted/50 rounded-t-md">
                <div className="col-span-2 font-medium">IP</div>
                <div className="col-span-2 font-medium">Número</div>
                <div className="col-span-2 font-medium">Status</div>
                <div className="col-span-2 font-medium">Operadora</div>
                <div className="col-span-3 font-medium">Consultor</div>
                <div className="col-span-1 font-medium text-right">Ações</div>
              </div>

              <div className="space-y-2">
                {loading ? (
                  <div className="text-center py-6 text-muted-foreground">Carregando...</div>
                ) : filteredChips.length > 0 ? (
                  filteredChips.map((chip) => (
                    <div key={chip._id} className="grid grid-cols-1 md:grid-cols-12 gap-4 p-4 border rounded-lg">
                      <div className="md:col-span-2">{chip.ip}</div>
                      <div className="md:col-span-2">{formatBRMobile(chip.number)}</div>
                      <div className="md:col-span-2">
                        <span className="text-sm">{chip.status}</span>
                      </div>
                      <div className="md:col-span-2">{chip.carrier}</div>
                      <div className="md:col-span-3">{chip.consultant || '-'}</div>
                      <div className="md:col-span-1 flex justify-end space-x-2">
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="h-8 w-8"
                          onClick={() => handleEditChip(chip)}
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                            <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                          </svg>
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="h-8 w-8 text-red-600 hover:text-red-700"
                          onClick={() => handleDeleteChip(chip)}
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <polyline points="3 6 5 6 21 6"></polyline>
                            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                            <line x1="10" y1="11" x2="10" y2="17"></line>
                            <line x1="14" y1="11" x2="14" y2="17"></line>
                          </svg>
                        </Button>
                      </div>
                    </div>
                  ))
                ) : filteredChips.length === 0 ? (
                  <div className="text-center py-6 text-muted-foreground">
                    {chips.length === 0 
                      ? 'Nenhum chip cadastrado' 
                      : 'Nenhum chip encontrado com os filtros atuais'}
                  </div>
                ) : null}
              </div>
            </CardContent>
          </Card>
        </>
      )}

      {activeList === 'tels' && (
        <>
          {/* Tabela de Tel Sistemas */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Tel Sistemas</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="bg-muted/50">
                      <th className="text-left p-3 w-1/4">Número</th>
                      <th className="text-center p-3 w-32">Wtt1</th>
                      <th className="text-center p-3 w-32">Wtt2</th>
                      <th className="text-center p-3 w-32">Wtt1 -clone</th>
                      <th className="text-center p-3 w-32">Wtt2 -clone</th>
                      <th className="text-center p-3 w-32">Business</th>
                      <th className="text-center p-3 w-32">Business -clone</th>
                      <th className="text-right p-3 w-24">Ações</th>
                    </tr>
                  </thead>
                  <tbody>
                    {loading ? (
                      <tr>
                        <td colSpan="8" className="text-center py-6 text-muted-foreground">Carregando...</td>
                      </tr>
                    ) : groupedTels.length > 0 ? (
                      groupedTels.map((group, index) => (
                        <tr key={index} className="border-b hover:bg-muted/50">
                          <td className="p-3 font-medium">
                            <div className="flex items-center gap-2">
                              <span>{group.number}</span>
                              {typeof group.batteryLevel === 'number' && (
                                <span className="text-xs text-muted-foreground">{group.batteryLevel}%</span>
                              )}
                              {group.pairedAt && (
                                <span className="text-xs px-2 py-0.5 rounded-full bg-green-100 text-green-700 border border-green-200">Conectado</span>
                              )}
                            </div>
                          </td>
                          {['Wtt1', 'Wtt2', 'Wtt1 -clone', 'Wtt2 -clone', 'Business', 'Business -clone'].map((type) => (
                            <td 
                              key={type}
                              className="text-center p-3 cursor-pointer hover:bg-muted/30"
                              onClick={() => handleEditTelType(group.number, type, group.types[type] || '')}
                            >
                              {group.types[type] || (
                                <span className="text-muted-foreground/50">+</span>
                              )}
                            </td>
                          ))}
                          <td className="p-3 text-right">
                            <div className="flex justify-end space-x-2">
                              {group.pairedAt && (
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-8 w-8 text-amber-600 hover:text-amber-700"
                                  title="Desconectar"
                                  onClick={async (e) => {
                                    e.stopPropagation();
                                    try {
                                      await phoneService.unpairTel({ number: group.number });
                                      const updated = await phoneService.getAllTelSystems();
                                      setTels(updated || []);
                                      setToast('Desconectado');
                                      setTimeout(() => setToast(''), 2500);
                                    } catch (err) {
                                      console.error('Erro ao desconectar', err);
                                      setError(err?.response?.data?.error || 'Erro ao desconectar');
                                    }
                                  }}
                                >
                                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <path d="M3 12h6"/>
                                    <path d="M15 12h6"/>
                                    <path d="M9 7v10"/>
                                  </svg>
                                </Button>
                              )}
                              <Button 
                                variant="ghost" 
                                size="icon" 
                                className="h-8 w-8"
                                title="Gerar QR"
                                onClick={(e) => { e.stopPropagation(); handleGenerateTelQR(group.number); }}
                              >
                                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                  <path d="M3 3h7v7H3zM14 3h7v7h-7zM14 14h7v7h-7zM3 14h7v7H3z"/>
                                </svg>
                              </Button>
                              <Button 
                                variant="ghost" 
                                size="icon" 
                                className="h-8 w-8 text-red-600 hover:text-red-700" 
                                onClick={async (e) => {
                                  e.stopPropagation();
                                  const ok = window.confirm(`Tem certeza que deseja excluir todos os registros do número ${group.number}?`);
                                  if (!ok) return;
                                  try {
                                    const idsToDelete = tels.filter(t => t.number === group.number).map(t => t._id).filter(Boolean);
                                    for (const id of idsToDelete) {
                                      await phoneService.deleteTelSystem(id);
                                    }
                                    setTels(prev => prev.filter(t => t.number !== group.number));
                                  } catch (err) {
                                    console.error('Erro ao excluir Tel Sistema', err);
                                    setError(err?.response?.data?.error || 'Erro ao excluir Tel Sistema');
                                  }
                                }}
                              >
                                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                  <polyline points="3 6 5 6 21 6"></polyline>
                                  <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                                  <line x1="10" y1="11" x2="10" y2="17"></line>
                                  <line x1="14" y1="11" x2="14" y2="17"></line>
                                </svg>
                              </Button>
                            </div>
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan="8" className="text-center py-6 text-muted-foreground">Nenhum registro de Tel Sistemas.</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </>
      )}

      {/* Modal de QR Code */}
      {qrModal.open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center"
          role="dialog"
          aria-modal="true"
          onClick={() => setQrModal({ open: false, number: '', sessionCode: '', url: '' })}
        >
          <div className="absolute inset-0 bg-black/50" />
          <div
            className="relative z-10 bg-white dark:bg-background border rounded-lg shadow-xl w-[95%] max-w-sm p-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-lg font-semibold">QR Code de Pareamento</h3>
              <button
                className="p-1 rounded hover:bg-muted"
                aria-label="Fechar"
                onClick={() => setQrModal({ open: false, number: '', sessionCode: '', url: '' })}
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
              </button>
            </div>
            <div className="text-sm text-muted-foreground mb-3">
              Número: <span className="font-medium">{qrModal.number}</span>
            </div>
            <div className="flex items-center justify-center">
              <img src={qrModal.url} alt="QR Code" className="w-60 h-60" />
            </div>
            <div className="mt-3 text-xs text-muted-foreground break-all">
              Session: {qrModal.sessionCode}
            </div>
            <div className="mt-4 flex justify-end">
              <button
                className="px-3 py-1.5 border rounded-md hover:bg-muted"
                onClick={() => setQrModal({ open: false, number: '', sessionCode: '', url: '' })}
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modais */}
      <AddChipModal 
        open={isAddChipOpen} 
        onOpenChange={setIsAddChipOpen} 
        onSave={handleChipSubmit} 
        chip={editingChip}
      />
      <AddTelModal 
        open={isAddTelOpen} 
        onOpenChange={(isOpen) => {
          if (!isOpen) setEditingTel(null);
          setIsAddTelOpen(isOpen);
        }} 
        onSave={handleTelSubmit}
        initialData={editingTel}
      />
    </div>
  );
};

export default PhonePage;
