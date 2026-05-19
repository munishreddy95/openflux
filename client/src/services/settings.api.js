import { api, extractApiData } from './api.service.js';

export async function fetchSettings() {
  return extractApiData(await api.get('/settings'));
}

export async function updateSettings(payload) {
  return extractApiData(await api.patch('/settings', payload));
}
