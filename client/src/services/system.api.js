import { api, extractApiData } from './api.service.js';

export async function fetchSystemUsage() {
  return extractApiData(await api.get('/system/usage'));
}
