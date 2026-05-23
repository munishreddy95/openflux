import { api, extractApiData } from './api.service.js';

export async function fetchSessionStatus() {
  return extractApiData(await api.get('/auth/session'));
}

export async function loginUser(payload) {
  return extractApiData(await api.post('/auth/login', payload));
}

export async function logoutUser() {
  return extractApiData(await api.post('/auth/logout'));
}

export async function changePassword(payload) {
  return extractApiData(await api.post('/auth/change-password', payload));
}
