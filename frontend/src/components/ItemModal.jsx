import React, { useState, useEffect } from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import { Cross2Icon } from '@radix-ui/react-icons';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';

const ItemModal = ({ isOpen, onClose, item, onSave }) => {
  const [formData, setFormData] = useState({
    name: '',
    type: '', // Inicia sem valor selecionado
    status: 'available',
    location: '',
    user: '',
    description: '',
    // Campos específicos de máquinas
    machineId: '',
    processor: '',
    ram: '',
    storage: ''
  });

  // Atualiza o formulário quando um item é passado (modo de edição)
  useEffect(() => {
    if (item) {
      setFormData({
        name: item.name || '',
        type: item.type || 'machine',
        status: item.status || 'available',
        location: item.location || '',
        user: item.user || '',
        description: item.description || '',
        machineId: item.machineId || '',
        processor: item.details?.processor || '',
        ram: item.details?.ram || '',
        storage: item.details?.storage || ''
      });
    } else {
      // Limpa o formulário para novo item
      setFormData({
        name: '',
        type: '', // Sem categoria selecionada
        status: 'available',
        location: '',
        user: '',
        description: '',
        machineId: '',
        processor: '',
        ram: '',
        storage: ''
      });
    }
  }, [item, isOpen]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSelectChange = (name, value) => {
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    
    // Validação básica
    if (!formData.name) {
      alert('Por favor, preencha o nome do item');
      return;
    }

    if (formData.type === 'machine' && !formData.machineId) {
      alert('Por favor, preencha o ID da máquina');
      return;
    }

    const itemData = {
      ...formData,
      details: {}
    };

    // Adiciona detalhes específicos de máquina se for o caso
    if (formData.type === 'machine') {
      itemData.details = {
        processor: formData.processor,
        ram: formData.ram,
        storage: formData.storage
      };
    }

    onSave(itemData);
    onClose();
  };

  return (
    <Dialog.Root open={isOpen} onOpenChange={onClose}>
      <Dialog.Portal>
        <Dialog.Overlay className="bg-black/50 fixed inset-0 z-50" />
        <Dialog.Content className="fixed top-[50%] left-[50%] max-h-[85vh] w-[90vw] max-w-[600px] translate-x-[-50%] translate-y-[-50%] rounded-md bg-background text-foreground p-6 shadow-lg border border-border focus:outline-none z-50 overflow-y-auto">
          <div className="mb-4">
            <Dialog.Title className="text-lg font-semibold">
              {item ? 'Editar Item' : 'Adicionar Novo Item'}
            </Dialog.Title>
            <Dialog.Description className="text-sm text-muted-foreground mt-1">
              Preencha os detalhes do item abaixo. Campos obrigatórios estão marcados com *.
            </Dialog.Description>
          </div>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Nome */}
            <div className="space-y-2">
              <label className="text-sm font-medium leading-none">
                Nome *
              </label>
              <Input
                name="name"
                value={formData.name}
                onChange={handleChange}
                placeholder="Ex: Computador da Recepção"
                required
              />
            </div>

            {/* Categoria */}
            <div className="space-y-2">
              <label className="text-sm font-medium leading-none">
                Categoria *
              </label>
              <Select
                value={formData.type}
                onValueChange={(value) => handleSelectChange('type', value)}
                disabled={!!item} // Não permite alterar a categoria ao editar
                required
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione uma categoria" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="machine">Máquina</SelectItem>
                  <SelectItem value="monitor">Monitor</SelectItem>
                  <SelectItem value="peripheral">Periférico</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Status */}
            <div className="space-y-2">
              <label className="text-sm font-medium leading-none">
                Status *
              </label>
              <Select
                value={formData.status}
                onValueChange={(value) => handleSelectChange('status', value)}
              >
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

            {/* Localização */}
            <div className="space-y-2">
              <label className="text-sm font-medium leading-none">
                Localização
              </label>
              <Select 
                name="location" 
                value={formData.status === 'maintenance' ? 'MANUTENÇÃO' : (formData.location || '')} 
                onValueChange={(value) => handleChange({ target: { name: 'location', value: value === 'null' ? null : value } })}
                disabled={formData.status === 'maintenance'}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione uma localização" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="null">Não especificado</SelectItem>
                  <SelectItem value="SETOR MNT - SALA LINK">SETOR MNT - SALA LINK</SelectItem>
                  <SelectItem value="SETOR MKT - SALA LINK">SETOR MKT - SALA LINK</SelectItem>
                  <SelectItem value="SETOR BKO - SALA LINK">SETOR BKO - SALA LINK</SelectItem>
                  <SelectItem value="OPERACIONAL">OPERACIONAL</SelectItem>
                  <SelectItem value="COMERCIAL">COMERCIAL</SelectItem>
                  <SelectItem value="RH">RH</SelectItem>
                  <SelectItem value="FINANCEIRO">FINANCEIRO</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Usuário Responsável */}
            <div className="space-y-2">
              <label className="text-sm font-medium leading-none">
                Usuário Responsável
              </label>
              <Input
                name="user"
                value={formData.user}
                onChange={handleChange}
                placeholder="Nome do usuário"
              />
            </div>

            {/* ID do Item (requerido pelo backend) */}
            <div className="space-y-2">
              <label className="text-sm font-medium leading-none">
                ID do Item/Máquina *
              </label>
              <Input
                name="machineId"
                value={formData.machineId}
                onChange={handleChange}
                placeholder="Ex: PC-001"
                required
              />
            </div>

            {/* Processador (apenas para máquinas) */}
            {formData.type === 'machine' && (
              <div className="space-y-2">
                <label className="text-sm font-medium leading-none">
                  Processador
                </label>
                <Input
                  name="processor"
                  value={formData.processor}
                  onChange={handleChange}
                  placeholder="Ex: Intel i5 10ª Geração"
                />
              </div>
            )}

            {/* Memória RAM (apenas para máquinas) */}
            {formData.type === 'machine' && (
              <div className="space-y-2">
                <label className="text-sm font-medium leading-none">
                  Memória RAM
                </label>
                <Select
                  value={formData.ram}
                  onValueChange={(value) => handleSelectChange('ram', value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione a memória RAM" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="4GB">4GB</SelectItem>
                    <SelectItem value="8GB">8GB</SelectItem>
                    <SelectItem value="16GB">16GB</SelectItem>
                    <SelectItem value="32GB">32GB</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* Armazenamento (apenas para máquinas) */}
            {formData.type === 'machine' && (
              <div className="space-y-2">
                <label className="text-sm font-medium leading-none">
                  Armazenamento
                </label>
                <Select
                  value={formData.storage}
                  onValueChange={(value) => handleSelectChange('storage', value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione o armazenamento" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="120GB SSD">120GB SSD</SelectItem>
                    <SelectItem value="120GB HD">120GB HD</SelectItem>
                    <SelectItem value="240GB SSD">240GB SSD</SelectItem>
                    <SelectItem value="240GB HD">240GB HD</SelectItem>
                    <SelectItem value="480GB SSD">480GB SSD</SelectItem>
                    <SelectItem value="480GB HD">480GB HD</SelectItem>
                    <SelectItem value="1TB SSD">1TB SSD</SelectItem>
                    <SelectItem value="1TB HD">1TB HD</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>

          {/* Descrição */}
          <div className="space-y-2">
            <label className="text-sm font-medium leading-none">
              Descrição/Detalhes
            </label>
            <Input
              name="description"
              value={formData.description}
              onChange={handleChange}
              placeholder="Adicione detalhes adicionais sobre o item..."
            />
          </div>

          {/* Botões de ação */}
          <div className="flex justify-end space-x-4 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
            >
              Cancelar
            </Button>
            <Button type="submit" className="bg-primary text-primary-foreground hover:bg-primary/90">
              {item ? 'Salvar Alterações' : 'Adicionar Item'}
            </Button>
          </div>
        </form>
        
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

export default ItemModal;
