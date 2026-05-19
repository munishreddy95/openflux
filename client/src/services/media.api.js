import { api, extractApiData } from './api.service.js';

export async function fetchMediaLibrary() {
  return extractApiData(await api.get('/media'));
}

export async function fetchMediaFiles(torrentId) {
  return extractApiData(await api.get(`/media/${torrentId}/files`));
}

export async function fetchMediaSubtitles(torrentId, fileId) {
  return extractApiData(await api.get(`/media/${torrentId}/files/${fileId}/subtitles`));
}

export async function uploadMediaSubtitleFile(torrentId, fileId, subtitleFile) {
  const formData = new FormData();
  formData.append('subtitle', subtitleFile);

  return extractApiData(await api.post(`/media/${torrentId}/files/${fileId}/subtitles`, formData, {
    headers: {
      'Content-Type': 'multipart/form-data'
    }
  }));
}

export function getStreamUrl(torrentId, fileId) {
  return `/api/media/${torrentId}/files/${fileId}/stream`;
}

export function getDownloadUrl(torrentId, fileId) {
  return `/api/media/${torrentId}/files/${fileId}/download`;
}

export function getSubtitleTrackUrl(torrentId, fileId, subtitleId) {
  return `/api/media/${torrentId}/files/${fileId}/subtitles/${encodeURIComponent(subtitleId)}`;
}

export function getFolderDownloadUrl(torrentId, folderPath = '') {
  const query = folderPath ? `?path=${encodeURIComponent(folderPath)}` : '';
  return `/api/media/${torrentId}/folders/download${query}`;
}
