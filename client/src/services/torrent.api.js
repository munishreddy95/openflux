import { api, extractApiData } from './api.service.js';

export async function fetchTorrents() {
  return extractApiData(await api.get('/torrents'));
}

export async function fetchTorrent(id) {
  return extractApiData(await api.get(`/torrents/${id}`));
}

export async function addMagnet(magnetURI) {
  return extractApiData(await api.post('/torrents/magnet', { magnetURI }));
}

export async function addTorrentFile(file) {
  const formData = new FormData();
  formData.append('torrent', file);
  return extractApiData(await api.post('/torrents/file', formData));
}

export async function pauseTorrent(id) {
  return extractApiData(await api.post(`/torrents/${id}/pause`));
}

export async function resumeTorrent(id) {
  return extractApiData(await api.post(`/torrents/${id}/resume`));
}

export async function updateTorrentFileMode(torrentId, fileId, payload) {
  return extractApiData(await api.patch(`/torrents/${torrentId}/files/${fileId}`, payload));
}

export async function deleteTorrent(id, deleteFiles = false) {
  return extractApiData(await api.delete(`/torrents/${id}`, { params: { deleteFiles } }));
}
