import { useState, useEffect } from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { toast } from 'sonner';
import api from '../services/apiService';
import { X } from 'lucide-react';

export default function LocationModal({ isOpen, onClose }) {
  const [name, setName] = useState('');
  const [locations, setLocations] = useState([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (isOpen) {
      fetchLocations();
    }
  }, [isOpen]);

  const fetchLocations = async () => {
    try {
      setIsLoading(true);
      const response = await api.get('/api/locations');
      setLocations(response.data);
    } catch (error) {
      console.error('Error fetching locations:', error);
      toast.error('Erro ao carregar localizações');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!name.trim()) {
      toast.error('O nome da localização é obrigatório');
      return;
    }

    try {
      setIsLoading(true);
      await api.post('/api/locations', { name });
      toast.success('Localização adicionada com sucesso!');
      setName('');
      fetchLocations();
    } catch (error) {
      console.error('Error adding location:', error);
      toast.error(error.response?.data?.error || 'Erro ao adicionar localização');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm('Tem certeza que deseja excluir esta localização?')) {
      try {
        await api.delete(`/api/locations/${id}`);
        toast.success('Localização removida com sucesso!');
        fetchLocations();
      } catch (error) {
        console.error('Error deleting location:', error);
        toast.error(error.response?.data?.error || 'Erro ao remover localização');
      }
    }
  };

  return (
    <Dialog.Root open={isOpen} onOpenChange={onClose}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-black/50 z-50" />
        <Dialog.Content className="fixed top-[50%] left-[50%] max-h-[85vh] w-[90vw] max-w-[450px] translate-x-[-50%] translate-y-[-50%] rounded-lg border bg-background p-6 shadow-lg focus:outline-none z-50">
          <div className="flex items-center justify-between mb-4">
            <Dialog.Title className="text-lg font-semibold">Gerenciar Localizações</Dialog.Title>
            <Dialog.Close asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8">
                <X className="h-4 w-4" />
                <span className="sr-only">Fechar</span>
              </Button>
            </Dialog.Close>
          </div>
          
          <div className="space-y-4">
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid gap-2">
                <Label htmlFor="location-name">Nova Localização</Label>
                <div className="flex gap-2">
                  <Input
                    id="location-name"
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Digite o nome da localização"
                    className="flex-1"
                  />
                  <Button type="submit" disabled={isLoading || !name.trim()}>
                    {isLoading ? 'Salvando...' : 'Adicionar'}
                  </Button>
                </div>
              </div>
            </form>

            <div className="rounded-md border">
              <div className="p-3 bg-muted/50">
                <h3 className="text-sm font-medium">Localizações existentes</h3>
              </div>
              <div className="max-h-60 overflow-y-auto">
                {locations.length === 0 ? (
                  <div className="p-4 text-center text-sm text-muted-foreground">
                    Nenhuma localização cadastrada
                  </div>
                ) : (
                  <ul className="divide-y">
                    {locations.map((location) => (
                      <li key={location._id} className="flex items-center justify-between p-3 hover:bg-muted/50">
                        <span className="text-sm">{location.name}</span>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 w-8 p-0 text-destructive hover:text-destructive/90"
                          onClick={() => handleDelete(location._id)}
                          title="Excluir localização"
                        >
                          <X className="h-4 w-4" />
                          <span className="sr-only">Excluir</span>
                        </Button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <Button variant="outline" onClick={onClose}>
                Fechar
              </Button>
            </div>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
