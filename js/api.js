class ApiService {
    static BASE_URL = 'http://localhost:3000/api';

    static async getUsers() {
        try {
            const response = await fetch(`${this.BASE_URL}/users`);
            if (!response.ok) {
                throw new Error('Failed to fetch users');
            }
            return await response.json();
        } catch (error) {
            console.error('Error fetching users:', error);
            throw error;
        }
    }

    static async createUser(userData) {
        try {
            const response = await fetch(`${this.BASE_URL}/users`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(userData),
            });
            if (!response.ok) {
                throw new Error('Failed to create user');
            }
            return await response.json();
        } catch (error) {
            console.error('Error creating user:', error);
            throw error;
        }
    }

    static async updateUser(userId, userData) {
        try {
            const response = await fetch(`${this.BASE_URL}/users/${userId}`, {
                method: 'PATCH',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(userData),
            });
            if (!response.ok) {
                throw new Error('Failed to update user');
            }
            return await response.json();
        } catch (error) {
            console.error('Error updating user:', error);
            throw error;
        }
    }

    static async deleteUser(userId) {
        try {
            const response = await fetch(`${this.BASE_URL}/users/${userId}`, {
                method: 'DELETE',
            });
            if (!response.ok) {
                throw new Error('Failed to delete user');
            }
            return await response.json();
        } catch (error) {
            console.error('Error deleting user:', error);
            throw error;
        }
    }
}

export default ApiService;
