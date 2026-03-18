import axios from 'axios';

// Get base URL for backend API
const API_URL = '/api/auth';

// Register user
export const registerUser = async (userData) => {
    try {
        const response = await axios.post(`${API_URL}/register`, userData);
        if (response.data) {
            localStorage.setItem('user', JSON.stringify(response.data));
        }
        return { success: true, data: response.data };
    } catch (error) {
        return { 
            success: false, 
            message: error.response?.data?.message || 'Failed to register' 
        };
    }
};

// Login user
export const loginUser = async (userData) => {
    try {
        const response = await axios.post(`${API_URL}/login`, userData);
        if (response.data) {
            localStorage.setItem('user', JSON.stringify(response.data));
        }
        return { success: true, data: response.data };
    } catch (error) {
        return { 
            success: false, 
            message: error.response?.data?.message || 'Invalid credentials' 
        };
    }
};

// Logout user
export const logoutUser = () => {
    localStorage.removeItem('user');
    window.location.reload();
};
