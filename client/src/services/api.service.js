import axios from 'axios';

export const api = axios.create({
  baseURL: '/api',
  timeout: 30000
});

export function extractApiData(response) {
  return response.data?.data;
}

export function getApiError(error) {
  return error?.response?.data?.message || error.message || 'Request failed';
}
