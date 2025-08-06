
class PartsApiService {
    static async getParts() {
        try {
            const response = await fetch('/api/parts');
            if (!response.ok) {
                throw new Error('Failed to fetch parts');
            }
            return await response.json();
        } catch (error) {
            console.error('Error fetching parts:', error);
            throw error;
        }
    }

    static async createPart(partData) {
        try {
            const response = await fetch('/api/parts', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(partData)
            });
            
            if (!response.ok) {
                throw new Error('Failed to create part');
            }
            
            return await response.json();
        } catch (error) {
            console.error('Error creating part:', error);
            throw error;
        }
    }

    static async getPart(id) {
        try {
            const response = await fetch(`/api/parts/${id}`);
            if (!response.ok) {
                throw new Error('Failed to fetch part');
            }
            return await response.json();
        } catch (error) {
            console.error('Error fetching part:', error);
            throw error;
        }
    }

    static async updatePart(id, partData) {
        try {
            const response = await fetch(`/api/parts/${id}`, {
                method: 'PATCH',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(partData)
            });
            
            if (!response.ok) {
                throw new Error('Failed to update part');
            }
            
            return await response.json();
        } catch (error) {
            console.error('Error updating part:', error);
            throw error;
        }
    }

    static async deletePart(id) {
        try {
            const response = await fetch(`/api/parts/${id}`, {
                method: 'DELETE'
            });
            
            if (!response.ok) {
                throw new Error('Failed to delete part');
            }
            
            return await response.json();
        } catch (error) {
            console.error('Error deleting part:', error);
            throw error;
        }
    }
}

export default PartsApiService;
