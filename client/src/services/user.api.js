import { api, extractApiData } from './api.service.js';

export async function fetchUsers() {
  return extractApiData(await api.get('/users'));
}

export async function createUser(payload) {
  return extractApiData(await api.post('/users', payload));
}

export async function issueTemporaryPassword(userId) {
  return extractApiData(await api.post(`/users/${userId}/temporary-password`));
}
