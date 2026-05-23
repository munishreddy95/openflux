import { useDeferredValue, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Download, Eye, Search, Tv2 } from 'lucide-react';
import Button from '../components/common/Button.jsx';
import EmptyState from '../components/common/EmptyState.jsx';
import Input from '../components/common/Input.jsx';
import { MediaLibrarySkeleton } from '../components/skeletons/PageSkeletons.jsx';
import MediaBrowser from '../components/media/MediaBrowser.jsx';
import { fetchMediaLibrary } from '../services/media.api.js';
import { getDownloadUrl } from '../services/media.api.js';
import { useTorrentStore } from '../store/torrent.store.js';
import { getApiError } from '../services/api.service.js';
import { formatBytes } from '../utils/format.js';

function getFileLocation(mediaItem) {
  const pathSegments = (mediaItem.path || mediaItem.name || '').split('/').filter(Boolean);
  const folderPath = pathSegments.slice(0, -1).join('/');
  return folderPath ? `${mediaItem.torrentName} / ${folderPath}` : mediaItem.torrentName;
}

export default function MediaLibrary() {
  const media = useTorrentStore((state) => state.media);
  const setMedia = useTorrentStore((state) => state.setMedia);
  const setMediaLoading = useTorrentStore((state) => state.setMediaLoading);
  const mediaLoading = useTorrentStore((state) => state.mediaLoading);
  const [search, setSearch] = useState('');
  const [error, setError] = useState('');
  const deferredSearch = useDeferredValue(search.trim().toLowerCase());

  useEffect(() => {
    let cancelled = false;

    async function loadMedia() {
      setMediaLoading(true);
      setError('');
      try {
        const nextMedia = await fetchMediaLibrary();
        if (!cancelled) {
          setMedia(nextMedia);
        }
      } catch (requestError) {
        if (!cancelled) {
          setError(getApiError(requestError));
        }
      } finally {
        if (!cancelled) {
          setMediaLoading(false);
        }
      }
    }

    void loadMedia();

    return () => {
      cancelled = true;
    };
  }, [setMedia, setMediaLoading]);

  const filteredMedia = media.filter((item) => {
    if (!deferredSearch) {
      return true;
    }

    return (
      item.name.toLowerCase().includes(deferredSearch) ||
      item.torrentName.toLowerCase().includes(deferredSearch) ||
      (item.path || '').toLowerCase().includes(deferredSearch)
    );
  });

  return (
    <div className="space-y-6">
      <section className="glass-panel rounded-[32px] p-6 sm:p-8">
        <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <h3 className="font-display text-3xl font-semibold text-white">Completed media</h3>
            <p className="mt-2 text-sm text-subtle">
              Browse completed torrents as folders, or search for a specific file to stream or download directly.
            </p>
          </div>
          <div className="w-full max-w-sm">
            <Input
              label="Filter by file, folder, or torrent name"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search media..."
              className="pr-11"
            />
            <Search className="pointer-events-none relative -mt-9 ml-auto mr-4 h-4 w-4 text-subtle" />
          </div>
        </div>
      </section>

      {error ? <p className="text-sm text-danger">{error}</p> : null}

      {mediaLoading && media.length === 0 ? (
        <MediaLibrarySkeleton />
      ) : null}

      {!mediaLoading && filteredMedia.length === 0 ? (
        deferredSearch ? (
          <div className="glass-panel rounded-[30px] p-8 text-sm text-subtle">
            No completed media matches this search.
          </div>
        ) : (
          <EmptyState
            icon={Tv2}
            title="No completed media yet"
            description="Complete a torrent with video or media files and it will appear here for streaming or direct download."
            actionLabel="Add torrent"
            actionTo="/add"
          />
        )
      ) : null}

      {!deferredSearch && filteredMedia.length > 0 ? <MediaBrowser media={filteredMedia} /> : null}

      {deferredSearch && filteredMedia.length > 0 ? (
        <section className="glass-panel rounded-[32px] p-6 sm:p-8">
          <div>
            <h3 className="font-display text-2xl font-semibold text-white">Search results</h3>
            <p className="mt-2 text-sm text-subtle">
              Direct file matches for &quot;{search.trim()}&quot;. Clear the search to return to folder browsing.
            </p>
          </div>

          <div className="mt-6 overflow-hidden rounded-[28px] border border-white/10 bg-white/5">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[780px] border-collapse">
                <thead className="bg-white/6">
                  <tr className="text-left text-[11px] uppercase tracking-[0.18em] text-subtle">
                    <th className="px-4 py-3 font-medium">File</th>
                    <th className="px-4 py-3 font-medium">Location</th>
                    <th className="px-4 py-3 font-medium">Size</th>
                    <th className="px-4 py-3 font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredMedia.map((item) => (
                    <tr key={`${item.torrentId}-${item.id}`} className="border-t border-white/8 text-sm text-subtle">
                      <td className="px-4 py-3">
                        <p className="font-medium text-white">{item.name}</p>
                        <p className="mt-1 text-xs text-subtle">{item.mimeType}</p>
                      </td>
                      <td className="px-4 py-3">{getFileLocation(item)}</td>
                      <td className="px-4 py-3 whitespace-nowrap text-white">{formatBytes(item.size)}</td>
                      <td className="px-4 py-3">
                        <div className="flex flex-wrap gap-2">
                          {item.isVideo ? (
                            <Button as={Link} to={`/media/${item.torrentId}/${item.id}`} variant="ghost" size="sm">
                              <Eye className="h-4 w-4" />
                              Watch
                            </Button>
                          ) : null}
                          <Button as="a" href={getDownloadUrl(item.torrentId, item.id)} variant="ghost" size="sm">
                            <Download className="h-4 w-4" />
                            Download
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
      ) : null}
    </div>
  );
}
