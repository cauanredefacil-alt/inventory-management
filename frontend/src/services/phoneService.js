import axios from 'axios';
import api from '../config/api';

// Axios defaults
axios.defaults.withCredentials = true;
axios.defaults.headers.common['Content-Type'] = 'application/json';
axios.defaults.headers.common['Accept'] = 'application/json';

const phoneService = {
  // Chips
  async getAllChips() {
    const { data } = await axios.get(api.chips.getAll());
    return data;
  },
  async createChip(payload) {
    const { data } = await axios.post(api.chips.create(), payload);
    return data;
  },
  async updateChip(id, payload) {
    const { data } = await axios.put(api.chips.update(id), payload);
    return data;
  },
  async deleteChip(id) {
    await axios.delete(api.chips.delete(id));
    return true;
  },

  // Tel Systems
  async getAllTelSystems() {
    const { data } = await axios.get(api.telsystems.getAll());
    return data;
  },
  async createTelSystem(payload) {
    const { data } = await axios.post(api.telsystems.create(), payload);
    return data;
  },
  async updateTelSystem(id, payload) {
    const { data } = await axios.put(api.telsystems.update(id), payload);
    return data;
  },
  async deleteTelSystem(id) {
    await axios.delete(api.telsystems.delete(id));
    return true;
  },
  async createTelSession({ number }) {
    const { data } = await axios.post(api.telsystems.session(), { number });
    return data;
  },
  async pairTel({ number, sessionCode }) {
    const { data } = await axios.post(api.telsystems.pair(), { number, sessionCode });
    return data;
  },
  async unpairTel({ number }) {
    const { data } = await axios.post(api.telsystems.unpair(), { number });
    return data;
  },
  async updateTelBattery({ number, batteryLevel }) {
    const { data } = await axios.put(api.telsystems.battery(), { number, batteryLevel });
    return data;
  },
};

export default phoneService;
