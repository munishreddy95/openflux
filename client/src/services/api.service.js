import axios from 'axios';
import { useAuthStore } from '../store/auth.store.js';

export const api = axios.create({
  baseURL: '/api',
  timeout: 30000,
  withCredentials: true
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error?.response?.status === 401) {
      useAuthStore.getState().clearSession();
    }

    return Promise.reject(error);
  }
);

export function extractApiData(response) {
  return response.data?.data;
}

export function getApiError(error) {
  return error?.response?.data?.message || error.message || 'Request failed';
}
