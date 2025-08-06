class ChipsApiService {
    static API_BASE_URL = '/api';

    static async getChips() {
        try {
            const response = await fetch(`${this.API_BASE_URL}/chips`);
            if (!response.ok) {
                throw new Error('Falha ao carregar chips');
            }
            const data = await response.json();
            return data.data; // Return the data array directly
        } catch (error) {
            console.error('Erro ao carregar chips:', error);
            throw error;
        }
    }

    static async getChip(id) {
        try {
            const response = await fetch(`${this.API_BASE_URL}/chips/${id}`);
            if (!response.ok) {
                throw new Error('Falha ao carregar chip');
            }
            const data = await response.json();
            return data.data;
        } catch (error) {
            console.error('Erro ao carregar chip:', error);
            throw error;
        }
    }

    static async createChip(chipData) {
        try {
            const response = await fetch(`${this.API_BASE_URL}/chips`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(chipData)
            });
            
            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.message || 'Falha ao criar chip');
            }
            
            const data = await response.json();
            return data.data;
        } catch (error) {
            console.error('Erro ao criar chip:', error);
            throw error;
        }
    }

    static async updateChip(id, chipData) {
        try {
            const response = await fetch(`${this.API_BASE_URL}/chips/${id}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(chipData)
            });
            
            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.message || 'Falha ao atualizar chip');
            }
            
            const data = await response.json();
            return data.data;
        } catch (error) {
            console.error('Erro ao atualizar chip:', error);
            throw error;
        }
    }

    static async deleteChip(id) {
        try {
            const response = await fetch(`${this.API_BASE_URL}/chips/${id}`, {
                method: 'DELETE'
            });
            
            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.message || 'Falha ao excluir chip');
            }
            
            const data = await response.json();
            return data.data;
        } catch (error) {
            console.error('Erro ao excluir chip:', error);
            throw error;
        }
    }
}

export default ChipsApiService;
