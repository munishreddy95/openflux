import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, ChevronRight, Download, Eye, Folder } from 'lucide-react';
import Button from '../common/Button.jsx';
import { getDownloadUrl, getFolderDownloadUrl } from '../../services/media.api.js';
import { formatBytes } from '../../utils/format.js';

function createFolderNode({ id, name, torrentId, path = '' }) {
  return {
    id,
    name,
    torrentId,
    path,
    folders: [],
    files: [],
    totalFiles: 0,
    totalSize: 0
  };
}

function sortByName(items) {
  items.sort((left, right) => left.name.localeCompare(right.name, undefined, { sensitivity: 'base' }));
}

function buildMediaTree(media = []) {
  const torrentRoots = [];
  const torrentMap = new Map();

  for (const item of media) {
    let torrentRoot = torrentMap.get(item.torrentId);

    if (!torrentRoot) {
      torrentRoot = createFolderNode({
        id: item.torrentId,
        name: item.torrentName,
        torrentId: item.torrentId
      });
      torrentRoot.foldersByPath = new Map([['', torrentRoot]]);
      torrentRoots.push(torrentRoot);
      torrentMap.set(item.torrentId, torrentRoot);
    }

    const safePath = (item.path || item.name || '').split('/').filter(Boolean).join('/');
    const segments = safePath.split('/').filter(Boolean);
    let folder = torrentRoot;
    let currentPath = '';

    for (const segment of segments.slice(0, -1)) {
      currentPath = currentPath ? `${currentPath}/${segment}` : segment;
      let nextFolder = torrentRoot.foldersByPath.get(currentPath);

      if (!nextFolder) {
        nextFolder = createFolderNode({
          id: `${item.torrentId}:${currentPath}`,
          name: segment,
          torrentId: item.torrentId,
          path: currentPath
        });
        torrentRoot.foldersByPath.set(currentPath, nextFolder);
        folder.folders.push(nextFolder);
      }

      folder = nextFolder;
    }

    folder.files.push({
      id: item.id,
      torrentId: item.torrentId,
      torrentName: item.torrentName,
      name: item.name,
      path: safePath || item.name,
      size: Number(item.size) || 0,
      mimeType: item.mimeType,
      isVideo: item.isVideo,
      isPlayable: item.isPlayable
    });
  }

  function finalizeFolder(folder) {
    sortByName(folder.folders);
    sortByName(folder.files);

    let totalFiles = folder.files.length;
    let totalSize = folder.files.reduce((sum, file) => sum + file.size, 0);

    for (const childFolder of folder.folders) {
      finalizeFolder(childFolder);
      totalFiles += childFolder.totalFiles;
      totalSize += childFolder.totalSize;
    }

    folder.totalFiles = totalFiles;
    folder.totalSize = totalSize;
  }

  for (const root of torrentRoots) {
    finalizeFolder(root);
  }

  sortByName(torrentRoots);

  return {
    torrentRoots,
    torrentMap
  };
}

function formatFileCount(count) {
  return `${count} file${count === 1 ? '' : 's'}`;
}

function formatFolderCount(count) {
  return `${count} folder${count === 1 ? '' : 's'}`;
}

function getParentPath(folderPath = '') {
  const segments = folderPath.split('/').filter(Boolean);
  return segments.slice(0, -1).join('/');
}

export default function MediaBrowser({ media = [] }) {
  const tree = useMemo(() => buildMediaTree(media), [media]);
  const [selectedTorrentId, setSelectedTorrentId] = useState(null);
  const [currentPath, setCurrentPath] = useState('');
  const selectedTorrent = selectedTorrentId ? tree.torrentMap.get(selectedTorrentId) || null : null;
  const currentFolder = selectedTorrent ? selectedTorrent.foldersByPath.get(currentPath) || selectedTorrent : null;

  useEffect(() => {
    if (!selectedTorrentId) {
      return;
    }

    if (!tree.torrentMap.has(selectedTorrentId)) {
      setSelectedTorrentId(null);
      setCurrentPath('');
      return;
    }

    const nextTorrent = tree.torrentMap.get(selectedTorrentId);
    if (!nextTorrent.foldersByPath.has(currentPath)) {
      setCurrentPath('');
    }
  }, [currentPath, selectedTorrentId, tree]);

  const breadcrumbSegments = currentPath ? currentPath.split('/').filter(Boolean) : [];

  if (!tree.torrentRoots.length) {
    return (
      <div className="glass-panel rounded-[30px] p-8 text-sm text-subtle">
        Completed folders will appear here after at least one downloaded file is ready.
      </div>
    );
  }

  if (!selectedTorrent || !currentFolder) {
    return (
      <section className="glass-panel rounded-[32px] p-6 sm:p-8">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h3 className="font-display text-2xl font-semibold text-white">Torrent folders</h3>
            <p className="mt-2 text-sm text-subtle">
              Open a torrent folder to browse its completed directories and files. Downloading a folder streams it as
              a zip archive.
            </p>
          </div>
        </div>

        <div className="mt-6 overflow-hidden rounded-[28px] border border-white/10 bg-white/5">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px] border-collapse">
              <thead className="bg-white/6">
                <tr className="text-left text-[11px] uppercase tracking-[0.18em] text-subtle">
                  <th className="px-4 py-3 font-medium">Torrent</th>
                  <th className="px-4 py-3 font-medium">Contains</th>
                  <th className="px-4 py-3 font-medium">Ready size</th>
                  <th className="px-4 py-3 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {tree.torrentRoots.map((torrent) => (
                  <tr key={torrent.id} className="border-t border-white/8 text-sm text-subtle">
                    <td className="px-4 py-3">
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedTorrentId(torrent.id);
                          setCurrentPath('');
                        }}
                        className="flex min-w-0 items-center gap-3 text-left text-white transition hover:text-highlight"
                      >
                        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-highlight/10 text-highlight">
                          <Folder className="h-5 w-5" />
                        </span>
                        <span className="min-w-0 break-words font-medium">{torrent.name}</span>
                      </button>
                    </td>
                    <td className="px-4 py-3">
                      {formatFolderCount(torrent.folders.length)} · {formatFileCount(torrent.totalFiles)}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-white">{formatBytes(torrent.totalSize)}</td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-2">
                        <Button
                          type="button"
                          onClick={() => {
                            setSelectedTorrentId(torrent.id);
                            setCurrentPath('');
                          }}
                          variant="ghost"
                          size="sm"
                        >
                          Open
                        </Button>
                        <Button as="a" href={getFolderDownloadUrl(torrent.id)} variant="ghost" size="sm">
                          <Download className="h-4 w-4" />
                          Zip
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>
    );
  }

  const rows = [
    ...currentFolder.folders.map((folder) => ({ type: 'folder', item: folder })),
    ...currentFolder.files.map((file) => ({ type: 'file', item: file }))
  ];

  return (
    <section className="glass-panel rounded-[32px] p-6 sm:p-8">
      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div>
          <div className="flex flex-wrap items-center gap-2 text-sm text-subtle">
            <button
              type="button"
              onClick={() => {
                setSelectedTorrentId(null);
                setCurrentPath('');
              }}
              className="transition hover:text-white"
            >
              Media
            </button>
            <ChevronRight className="h-4 w-4" />
            <button
              type="button"
              onClick={() => setCurrentPath('')}
              className="transition hover:text-white"
            >
              {selectedTorrent.name}
            </button>
            {breadcrumbSegments.map((segment, index) => {
              const nextPath = breadcrumbSegments.slice(0, index + 1).join('/');
              return (
                <span key={nextPath} className="contents">
                  <ChevronRight className="h-4 w-4" />
                  <button
                    type="button"
                    onClick={() => setCurrentPath(nextPath)}
                    className="transition hover:text-white"
                  >
                    {segment}
                  </button>
                </span>
              );
            })}
          </div>
          <h3 className="mt-4 font-display text-2xl font-semibold text-white">{currentFolder.name}</h3>
          <p className="mt-2 text-sm text-subtle">
            {formatFolderCount(currentFolder.folders.length)} · {formatFileCount(currentFolder.totalFiles)} ·{' '}
            {formatBytes(currentFolder.totalSize)} ready to download
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            onClick={() => {
              if (currentPath) {
                setCurrentPath(getParentPath(currentPath));
                return;
              }

              setSelectedTorrentId(null);
            }}
            variant="ghost"
            size="sm"
          >
            <ArrowLeft className="h-4 w-4" />
            {currentPath ? 'Up one folder' : 'Back to torrents'}
          </Button>
          <Button as="a" href={getFolderDownloadUrl(selectedTorrent.id, currentFolder.path)} size="sm">
            <Download className="h-4 w-4" />
            Download zip
          </Button>
        </div>
      </div>

      {rows.length === 0 ? (
        <div className="mt-6 rounded-[24px] border border-white/10 bg-white/4 p-5 text-sm text-subtle">
          This folder does not contain any completed files yet.
        </div>
      ) : (
        <div className="mt-6 overflow-hidden rounded-[28px] border border-white/10 bg-white/5">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[780px] border-collapse">
              <thead className="bg-white/6">
                <tr className="text-left text-[11px] uppercase tracking-[0.18em] text-subtle">
                  <th className="px-4 py-3 font-medium">Name</th>
                  <th className="px-4 py-3 font-medium">Type</th>
                  <th className="px-4 py-3 font-medium">Ready size</th>
                  <th className="px-4 py-3 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => {
                  if (row.type === 'folder') {
                    const folder = row.item;
                    return (
                      <tr key={folder.id} className="border-t border-white/8 text-sm text-subtle">
                        <td className="px-4 py-3">
                          <button
                            type="button"
                            onClick={() => setCurrentPath(folder.path)}
                            className="flex min-w-0 items-center gap-3 text-left text-white transition hover:text-highlight"
                          >
                            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-highlight/10 text-highlight">
                              <Folder className="h-5 w-5" />
                            </span>
                            <span className="min-w-0 break-words font-medium">{folder.name}</span>
                          </button>
                        </td>
                        <td className="px-4 py-3">
                          {formatFolderCount(folder.folders.length)} · {formatFileCount(folder.totalFiles)}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-white">{formatBytes(folder.totalSize)}</td>
                        <td className="px-4 py-3">
                          <div className="flex flex-wrap gap-2">
                            <Button type="button" onClick={() => setCurrentPath(folder.path)} variant="ghost" size="sm">
                              Open
                            </Button>
                            <Button as="a" href={getFolderDownloadUrl(folder.torrentId, folder.path)} variant="ghost" size="sm">
                              <Download className="h-4 w-4" />
                              Zip
                            </Button>
                          </div>
                        </td>
                      </tr>
                    );
                  }

                  const file = row.item;
                  return (
                    <tr key={file.id} className="border-t border-white/8 text-sm text-subtle">
                      <td className="px-4 py-3">
                        <p className="break-words font-medium text-white">{file.name}</p>
                      </td>
                      <td className="px-4 py-3">{file.mimeType || 'File'}</td>
                      <td className="px-4 py-3 whitespace-nowrap text-white">{formatBytes(file.size)}</td>
                      <td className="px-4 py-3">
                        <div className="flex flex-wrap gap-2">
                          {file.isVideo ? (
                            <Button as={Link} to={`/media/${file.torrentId}/${file.id}`} variant="ghost" size="sm">
                              <Eye className="h-4 w-4" />
                              Watch
                            </Button>
                          ) : null}
                          <Button as="a" href={getDownloadUrl(file.torrentId, file.id)} variant="ghost" size="sm">
                            <Download className="h-4 w-4" />
                            Download
                          </Button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </section>
  );
}
