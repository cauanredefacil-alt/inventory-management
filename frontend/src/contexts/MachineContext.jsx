import React, { createContext, useState, useEffect, useContext } from 'react';
import machineService from '../services/machineService';

const MachineContext = createContext();

export const MachineProvider = ({ children }) => {
  const [machines, setMachines] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const getAllMachines = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await machineService.getAllMachines();
      const formattedMachines = data.map(machine => 
        machineService.formatMachineForFrontend(machine)
      );
      setMachines(formattedMachines);
      return formattedMachines;
    } catch (err) {
      console.error('Erro ao carregar itens:', err);
      setError('Não foi possível carregar os itens. Tente novamente mais tarde.');
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const createMachine = async (machineData) => {
    try {
      setLoading(true);
      const newMachine = await machineService.createMachine(machineData);
      const formattedMachine = machineService.formatMachineForFrontend(newMachine);
      setMachines(prev => [formattedMachine, ...prev]);
      return formattedMachine;
    } catch (err) {
      console.error('Erro ao adicionar item:', err);
      setError('Erro ao adicionar item. Verifique os dados e tente novamente.');
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const updateMachine = async (id, machineData) => {
    try {
      setLoading(true);
      const updatedMachine = await machineService.updateMachine(id, machineData);
      const formattedMachine = machineService.formatMachineForFrontend(updatedMachine);
      setMachines(prev => 
        prev.map(machine => 
          machine.id === id ? formattedMachine : machine
        )
      );
      return formattedMachine;
    } catch (err) {
      console.error('Erro ao atualizar item:', err);
      setError('Erro ao atualizar item. Verifique os dados e tente novamente.');
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const deleteMachine = async (id) => {
    try {
      setLoading(true);
      await machineService.deleteMachine(id);
      setMachines(prev => prev.filter(machine => machine.id !== id));
      return { success: true };
    } catch (err) {
      console.error('Erro ao remover item:', err);
      setError('Erro ao remover item. Tente novamente mais tarde.');
      throw err;
    } finally {
      setLoading(false);
    }
  };

  // Carregar itens ao iniciar
  useEffect(() => {
    getAllMachines();
  }, []);

  return (
    <MachineContext.Provider
      value={{
        machines,
        loading,
        error,
        getAllMachines,
        createMachine,
        updateMachine,
        deleteMachine,
        setMachines,
        setLoading,
        setError
      }}
    >
      {children}
    </MachineContext.Provider>
  );
};

export const useMachines = () => {
  const context = useContext(MachineContext);
  if (context === undefined) {
    throw new Error('useMachines must be used within a MachineProvider');
  }
  return context;
};

export default MachineContext;
