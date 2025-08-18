import React, { useState, useEffect, useMemo } from 'react';
import { Button } from './components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from './components/ui/card';
import { Input } from './components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './components/ui/select';
import { HardDrive, LayoutGrid, MapPin, Monitor, Moon, Mouse, Package, Pencil, Phone, Plus, RefreshCw, Search, Sun, Trash2, User, Users, CheckCircle2, PlayCircle, Wrench } from 'lucide-react';
import ItemModal from './components/ItemModal';
import DashboardCard from './components/DashboardCard';
import StatusBadge from './components/StatusBadge';
import Navbar from './components/Navbar';
import PhonePage from './components/PhonePage';
import WallpaperManager from './pages/WallpaperManager';
import BlockSites from './pages/BlockSites';
import UsersPage from './pages/Users';
import { useMachines } from './contexts/MachineContext';
import './App.css';

function App() {
  const [activeSection, setActiveSection] = useState('estoque');
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState('all');
  const [locationFilter, setLocationFilter] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);
  const PAGE_SIZE = 10;
  
  // Estados para o modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [currentItem, setCurrentItem] = useState(null);
  
  const { 
    machines, 
    loading, 
    error, 
    getAllMachines,
    createMachine,
    updateMachine,
    deleteMachine,
    setError
  } = useMachines();

  // Calcular estatísticas
  const stats = useMemo(() => {
    const totalItems = machines.length;
    const machinesCount = machines.filter(item => item.type === 'máquina' || item.type === 'machine').length;
    const monitorsCount = machines.filter(item => item.type === 'monitor').length;
    const peripheralsCount = machines.filter(item => item.type === 'periférico' || item.type === 'peripheral').length;

    const availableCount = machines.filter(item => item.status === 'available').length;
    const inUseCount = machines.filter(item => item.status === 'in-use').length;
    const maintenanceCount = machines.filter(item => item.status === 'maintenance').length;
    
    return {
      totalItems,
      machines: machinesCount,
      monitors: monitorsCount,
      peripherals: peripheralsCount,
      available: availableCount,
      inUse: inUseCount,
      maintenance: maintenanceCount,
    };
  }, [machines]);

  // Função para carregar itens
  const loadItems = async () => {
    try {
      await getAllMachines();
    } catch (error) {
      console.error('Erro ao carregar itens:', error);
      setError('Erro ao carregar os itens do inventário');
    }
  };

  // Função para recarregar a lista
  const handleRefresh = () => {
    loadItems();
  };

  
  useEffect(() => {
    loadItems();
  }, []);

  // Função para abrir o modal de adicionar item
  const handleAddItem = () => {
    setCurrentItem(null);
    setIsModalOpen(true);
  };
  
  // Função para abrir o modal de editar item
  const handleEditItem = (item) => {
    setCurrentItem(item);
    setIsModalOpen(true);
  };
  
  // Função para salvar item (criar ou atualizar)
  const handleSaveItem = async (itemData) => {
    try {
      if (currentItem) {
        // Atualizar item existente
        await updateMachine(currentItem.id, itemData);
      } else {
        // Criar novo item
        await createMachine(itemData);
      }
      // Recarregar a lista de itens
      await loadItems();
      setIsModalOpen(false);
    } catch (error) {
      console.error('Erro ao salvar item:', error);
      // Você pode adicionar um toast de erro aqui
    }
  };

  // Função para excluir um item
  const handleDeleteItem = async (itemId, itemName) => {
    if (window.confirm(`Tem certeza que deseja excluir o item "${itemName}"? Esta ação não pode ser desfeita.`)) {
      try {
        await deleteMachine(itemId);
        await loadItems();
      } catch (error) {
        console.error('Erro ao excluir item:', error);
        // Você pode adicionar um toast de erro aqui
      }
    }
  };

  const filteredItems = machines.filter(item => {
    const searchLower = searchTerm.toLowerCase();
    const matchesSearch = 
      item.name.toLowerCase().includes(searchLower) ||
      (item.machineID && String(item.machineID).padStart(3, '0').toLowerCase().includes(searchLower)) ||
      (item.user && item.user.toLowerCase().includes(searchLower));
    const matchesStatus = statusFilter === 'all' || item.status === statusFilter;
    const matchesType = typeFilter === 'all' || item.type === typeFilter;
    const matchesLocation = locationFilter === 'all' || item.location === locationFilter;
    
    return matchesSearch && matchesStatus && matchesType && matchesLocation;
  });

  // Paginação
  const totalPages = Math.max(1, Math.ceil(filteredItems.length / PAGE_SIZE));
  const pageStartIndex = (currentPage - 1) * PAGE_SIZE;
  const paginatedItems = filteredItems.slice(pageStartIndex, pageStartIndex + PAGE_SIZE);

  // Resetar para primeira página quando filtros ou dados mudarem
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, statusFilter, typeFilter, locationFilter, machines]);

  const getStatusBadgeVariant = (status) => {
    switch (status) {
      case 'available':
        return 'available';
      case 'in-use':
        return 'in-use';
      case 'maintenance':
        return 'maintenance';
      default:
        return 'default';
    }
  };

  const getTypeIcon = (type) => {
    switch (type) {
      case 'machine':
        return <HardDrive className="h-4 w-4 mr-2" />;
      case 'monitor':
        return <Monitor className="h-4 w-4 mr-2" />;
      case 'peripheral':
        return <Mouse className="h-4 w-4 mr-2" />;
      default:
        return null;
    }
  };

  if (loading && activeSection === 'estoque') {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (error && activeSection === 'estoque') {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen p-4">
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative mb-4" role="alert">
          <strong className="font-bold">Erro ao carregar os dados!</strong>
          <span className="block sm:inline"> {error}</span>
        </div>
        <button
          onClick={loadItems}
          className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded flex items-center"
        >
          <RefreshCw className="mr-2 h-4 w-4" />
          Tentar novamente
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar activeItem={activeSection} onChangeActive={setActiveSection} />
      {activeSection === 'telefone' ? (
        <div className="container mx-auto px-4 py-8">
          <PhonePage />
        </div>
      ) : activeSection === 'wallpaper' ? (
        <div className="container mx-auto px-4 py-8">
          <WallpaperManager />
        </div>
      ) : activeSection === 'blocksites' ? (
        <div className="container mx-auto px-4 py-8">
          <BlockSites />
        </div>
      ) : activeSection === 'usuarios' ? (
        <div className="container mx-auto px-4 py-8">
          <UsersPage />
        </div>
      ) : (
      <div className="container mx-auto px-4 py-8">
        {/* Botão de adicionar item */}
        <div className="flex justify-end mb-8">
          <Button 
            className="bg-primary text-primary-foreground hover:bg-primary/90"
            onClick={handleAddItem}
          >
            <Plus className="h-4 w-4 mr-2" />
            Adicionar Item
          </Button>
        </div>

        {/* Dashboard Stats */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <DashboardCard 
            title="Total de Itens" 
            value={stats.totalItems} 
            icon={Package} 
            color="primary"
          />
          <DashboardCard 
            title="Máquinas" 
            value={stats.machines} 
            icon={HardDrive} 
            color="primary"
          />
          <DashboardCard 
            title="Monitores" 
            value={stats.monitors} 
            icon={Monitor} 
            color="secondary"
          />
          <DashboardCard 
            title="Periféricos" 
            value={stats.peripherals} 
            icon={Mouse} 
            color="accent"
          />
          <DashboardCard 
            title="Disponíveis" 
            value={stats.available} 
            icon={CheckCircle2} 
            color="primary"
          />
          <DashboardCard 
            title="Em uso" 
            value={stats.inUse} 
            icon={PlayCircle} 
            color="secondary"
          />
          <DashboardCard 
            title="Manutenção" 
            value={stats.maintenance} 
            icon={Wrench} 
            color="warning"
          />
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
                  placeholder="Buscar itens..."
                  className="pl-10"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
              
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os status</SelectItem>
                  <SelectItem value="available">Disponível</SelectItem>
                  <SelectItem value="in-use">Em uso</SelectItem>
                  <SelectItem value="maintenance">Manutenção</SelectItem>
                </SelectContent>
              </Select>
              
              <Select value={typeFilter} onValueChange={setTypeFilter}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Tipo" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os tipos</SelectItem>
                  <SelectItem value="machine">Máquina</SelectItem>
                  <SelectItem value="monitor">Monitor</SelectItem>
                  <SelectItem value="peripheral">Periférico</SelectItem>
                </SelectContent>
              </Select>
              
              <Select value={locationFilter} onValueChange={setLocationFilter}>
                <SelectTrigger className="w-[220px]">
                  <SelectValue placeholder="Localização" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas as localizações</SelectItem>
                  <SelectItem value="SETOR MNT - SALA LINK">SETOR MNT - SALA LINK</SelectItem>
                  <SelectItem value="SETOR MKT - SALA LINK">SETOR MKT - SALA LINK</SelectItem>
                  <SelectItem value="SETOR BKO - SALA LINK">SETOR BKO - SALA LINK</SelectItem>
                  <SelectItem value="OPERACIONAL">OPERACIONAL</SelectItem>
                  <SelectItem value="COMERCIAL">COMERCIAL</SelectItem>
                  <SelectItem value="RH">RH</SelectItem>
                  <SelectItem value="FINANCEIRO">FINANCEIRO</SelectItem>
                </SelectContent>
              </Select>
              <Button
                variant="outline"
                className="px-3"
                onClick={() => {
                  setSearchTerm('');
                  setStatusFilter('all');
                  setTypeFilter('all');
                  setLocationFilter('all');
                }}
                aria-label="Limpar filtros"
                title="Limpar filtros"
              >
                X
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Recent Items */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Itens Recentes</CardTitle>
            <div className="flex items-center space-x-2">
              <Button 
                variant="outline" 
                size="sm"
                onClick={loadItems}
                disabled={loading}
              >
                <RefreshCw className={`mr-2 h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
                Atualizar
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {filteredItems.length > 0 ? (
              <div className="w-full">
                {/* Cabeçalho da tabela */}
                <div className="hidden md:grid grid-cols-12 gap-4 px-4 py-2 bg-muted/50 rounded-t-md">
                  <div className="col-span-4 font-medium">Item</div>
                  <div className="col-span-2 font-medium">Categoria</div>
                  <div className="col-span-2 font-medium">Status</div>
                  <div className="col-span-3 font-medium">Localização</div>
                  <div className="col-span-1 font-medium text-right">Ações</div>
                </div>
                
                {/* Linhas da tabela */}
                <div className="space-y-2">
                  {paginatedItems.map((item) => (
                    <div 
                      key={item.id} 
                      className="grid grid-cols-1 md:grid-cols-12 gap-4 p-4 border rounded-lg hover:bg-accent/5 transition-colors"
                    >
                      {/* Item */}
                      <div className="md:col-span-4 flex items-center space-x-3">
                        <div className={`p-2 rounded-lg ${
                          item.type === 'máquina' ? 'bg-green-100 text-green-500' :
                          item.type === 'monitor' ? 'bg-blue-100 text-blue-500' :
                          'bg-green-100 text-green-600'
                        }`}>
                          {item.type === 'máquina' ? <HardDrive className="h-4 w-4" /> :
                           item.type === 'monitor' ? <Monitor className="h-4 w-4" /> :
                           <Mouse className="h-4 w-4" />}
                        </div>
                        <div className="min-w-0">
                          <h3 className="font-medium truncate">{String(item.machineID).padStart(3, '0')} - {item.name}</h3>
                          {item.details.processor && (
                            <p className="text-xs text-muted-foreground truncate">
                              {item.details.processor} • {item.details.ram} • {item.details.storage}
                            </p>
                          )}
                        </div>
                      </div>
                      
                      {/* Categoria */}
                      <div className="md:col-span-2 flex items-center">
                        <span className="capitalize">{item.type}</span>
                      </div>
                      
                      {/* Status */}
                      <div className="md:col-span-2 flex items-center">
                        <StatusBadge status={item.status} />
                      </div>
                      
                      {/* Localização */}
                      <div className="md:col-span-3">
                        <div className="flex items-center space-x-2">
                          <MapPin className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                          <span className="text-sm">{item.location}</span>
                        </div>
                        {item.user && (
                          <div className="flex items-center space-x-2 mt-1">
                            <User className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                            <span className="text-xs text-muted-foreground">
                              {item.user}
                            </span>
                          </div>
                        )}
                      </div>
                      
                      {/* Ações */}
                      <div className="md:col-span-1 flex items-center justify-end space-x-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleEditItem(item);
                          }}
                        >
                          <Pencil className="h-4 w-4" />
                          <span className="sr-only">Editar</span>
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-destructive hover:text-destructive/90"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteItem(item.id, item.name);
                          }}
                        >
                          <Trash2 className="h-4 w-4" />
                          <span className="sr-only">Excluir</span>
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Paginação */}
                <div className="flex items-center justify-between px-2 py-3">
                  <p className="text-sm text-muted-foreground">
                    Mostrando {filteredItems.length === 0 ? 0 : pageStartIndex + 1}
                    –{Math.min(pageStartIndex + PAGE_SIZE, filteredItems.length)} de {filteredItems.length}
                  </p>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                      disabled={currentPage === 1}
                    >
                      Anterior
                    </Button>
                    <span className="text-sm text-muted-foreground">
                      Página {currentPage} de {totalPages}
                    </span>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                      disabled={currentPage === totalPages}
                    >
                      Próxima
                    </Button>
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-center py-8">
                <p className="text-muted-foreground">Nenhum item encontrado com os filtros atuais.</p>
                <Button 
                  variant="outline" 
                  className="mt-4"
                  onClick={() => {
                    setSearchTerm('');
                    setStatusFilter('all');
                    setTypeFilter('all');
                    setLocationFilter('all');
                  }}
                >
                  Limpar filtros
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
      )}
      
      {activeSection === 'estoque' && (
        <ItemModal 
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          item={currentItem}
          onSave={handleSaveItem}
        />
      )}
    </div>
  );
}

export default App;
