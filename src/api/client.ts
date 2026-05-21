import axios, { AxiosInstance } from 'axios';

export function createApiClient(baseURL?: string, timeout?: number): AxiosInstance {
  const client = axios.create({
    baseURL: baseURL || import.meta.env.VITE_API_BASE_URL || '/api/v1',
    timeout: timeout || 30000,
    headers: {
      'Content-Type': 'application/json',
    },
  });

  client.interceptors.request.use((config) => {
    const token = localStorage.getItem('auth_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  });

  client.interceptors.response.use(
    (response) => response,
    (error) => {
      if (error.response?.status === 401) {
        localStorage.removeItem('auth_token');
        window.location.href = '/login';
      }
      return Promise.reject(error);
    }
  );

  return client;
}

export const apiClient = createApiClient();
export default apiClient;
