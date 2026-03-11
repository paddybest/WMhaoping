import axios from 'axios';
import { API_BASE_URL } from '../../constants';

// Token management
export const setToken = (token: string) => {
  localStorage.setItem('token', token);
};

export const getToken = () => {
  return localStorage.getItem('token');
};

export const removeToken = () => {
  localStorage.removeItem('token');
};

// Request interceptor
axios.interceptors.request.use((config) => {
  const token = getToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Response interceptor
axios.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      removeToken();
      window.location.hash = '#/login';
    }
    return Promise.reject(error);
  }
);

// Auth service functions
// Merchant login with username/password
export const merchantLogin = async (username: string, password: string) => {
  try {
    const response = await axios.post(`${API_BASE_URL}/merchant/auth/login`, {
      username,
      password
    });
    const { token } = response.data.data;
    setToken(token);
    return response.data;
  } catch (error) {
    console.error('Merchant login failed:', error);
    throw error;
  }
};

// Merchant register
export const merchantRegister = async (username: string, password: string, shopName: string) => {
  try {
    const response = await axios.post(`${API_BASE_URL}/merchant/auth/register`, {
      username,
      password,
      shopName
    });
    const { token } = response.data.data;
    setToken(token);
    return response.data;
  } catch (error) {
    console.error('Merchant registration failed:', error);
    throw error;
  }
};

// WeChat code login (for mini-program users)
export const login = async (code: string) => {
  try {
    const response = await axios.post(`${API_BASE_URL}/auth/wechat-login`, { code });
    const { token } = response.data.data;
    setToken(token);
    return response.data;
  } catch (error) {
    console.error('Login failed:', error);
    throw error;
  }
};

export const logout = () => {
  removeToken();
  window.location.hash = '#/login';
};

export const getCurrentUser = async () => {
  try {
    const token = getToken();
    if (!token) {
      return null;
    }

    const response = await axios.get(`${API_BASE_URL}/auth/me`);
    return response.data.data;
  } catch (error) {
    console.error('Get current user failed:', error);
    return null;
  }
};

export const isAuthenticated = () => {
  return !!getToken();
};