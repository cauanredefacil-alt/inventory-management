import axios from 'axios';
import api from '../config/api';

// Configuração global do Axios
axios.defaults.withCredentials = true;
axios.defaults.headers.common['Content-Type'] = 'application/json';
axios.defaults.headers.common['Accept'] = 'application/json';

const machineService = {
  // Buscar todas as máquinas
  async getAllMachines() {
    try {
      const response = await axios.get(api.machines.getAll());
      return response.data;
    } catch (error) {
      console.error('Erro ao buscar máquinas:', error);
      throw error;
    }
  },

  // Buscar máquina por ID
  async getMachineById(id) {
    try {
      const response = await axios.get(api.machines.getById(id));
      return response.data;
    } catch (error) {
      console.error(`Erro ao buscar máquina com ID ${id}:`, error);
      throw error;
    }
  },

  // Criar nova máquina
  async createMachine(machineData) {
    try {
      const payload = this.formatMachineForBackend(machineData);
      const response = await axios.post(api.machines.create(), payload);
      return response.data;
    } catch (error) {
      console.error('Erro ao criar máquina:', error?.response?.data || error);
      throw error;
    }
  },

  // Atualizar máquina existente
  async updateMachine(id, machineData) {
    try {
      const payload = this.formatMachineForBackend(machineData);
      const response = await axios.put(api.machines.update(id), payload);
      return response.data;
    } catch (error) {
      console.error(`Erro ao atualizar máquina com ID ${id}:`, error?.response?.data || error);
      throw error;
    }
  },

  // Deletar máquina
  async deleteMachine(id) {
    try {
      await axios.delete(api.machines.delete(id));
      return true;
    } catch (error) {
      console.error(`Erro ao deletar máquina com ID ${id}:`, error);
      throw error;
    }
  },

  // Formatador para o frontend
  formatMachineForFrontend(machine) {
    return {
      id: machine._id,
      name: machine.name,
      agentUrl: machine.agentUrl || null,
      type: machine.category,
      status: this.mapStatus(machine.status),
      location: machine.location || 'Não especificado',
      user: machine.user || null,
      machineID: machine.machineID || machine.machineId || '',
      details: {
        processor: machine.processor,
        ram: machine.ram,
        storage: machine.storage,
        description: machine.description
      }
    };
  },

  // Mapear status do backend para o frontend
  mapStatus(backendStatus) {
    const statusMap = {
      'disponível': 'available',
      'em uso': 'in-use',
      'manutenção': 'maintenance'
    };
    return statusMap[backendStatus] || 'unavailable';
  },

  // Mapear dados do frontend para o backend
  formatMachineForBackend(frontend) {
    // Mapear categoria para o esperado pelo backend (pt-BR)
    const categoryMap = {
      machine: 'máquina',
      monitor: 'monitor',
      peripheral: 'periférico',
    };
    // Mapear status para pt-BR
    const statusMap = {
      'available': 'disponível',
      'in-use': 'em uso',
      'maintenance': 'manutenção',
    };

    const payload = {
      name: frontend.name,
      category: categoryMap[frontend.type] || frontend.type, // aceita já pt-BR se vier
      status: statusMap[frontend.status] || frontend.status, // aceita já pt-BR se vier
      location: frontend.location || undefined,
      user: frontend.user || undefined,
      machineID: frontend.machineId || frontend.machineID || undefined, // Handle both machineId and machineID
      agentUrl: frontend.agentUrl || undefined,
      processor: frontend.processor || undefined,
      ram: frontend.ram || undefined,
      storage: frontend.storage || undefined,
      description: frontend.description || undefined,
    };

    // Remover chaves com undefined para evitar validação de enum com string vazia
    Object.keys(payload).forEach((k) => {
      if (payload[k] === undefined || payload[k] === '') {
        delete payload[k];
      }
    });

    return payload;
  }
};

export default machineService;
