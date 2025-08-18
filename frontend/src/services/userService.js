import api from './apiService';

const userService = {
  async list() {
    const { data } = await api.get('/api/users');
    return Array.isArray(data) ? data : [];
  },
  async create(payload) {
    const { data } = await api.post('/api/users', payload);
    return data;
  }
};

export default userService;
