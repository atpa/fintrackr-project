import axios from 'axios';

const API_URL = '/api'; // Используем относительный путь, так как настроим прокси

const api = axios.create({
    baseURL: API_URL,
    withCredentials: true, // Разрешаем отправку cookie
});

// Функции для работы с аутентификацией
export const register = (userData) => api.post('/auth/register', userData);
export const login = (credentials) => api.post('/auth/login', credentials);
export const logout = () => api.post('/auth/logout');
export const refreshToken = () => api.post('/auth/refresh');

// Функции для работы со счетами
export const getAccounts = () => api.get('/accounts');
export const createAccount = (accountData) => api.post('/accounts', accountData);

export default api;
