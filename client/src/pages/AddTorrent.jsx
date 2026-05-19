import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AlertTriangle, FileUp, Magnet } from 'lucide-react';
import Button from '../components/common/Button.jsx';
import Input from '../components/common/Input.jsx';
import { addMagnet, addTorrentFile } from '../services/torrent.api.js';
import { useTorrentStore } from '../store/torrent.store.js';
import { getApiError } from '../services/api.service.js';

export default function AddTorrent() {
  const navigate = useNavigate();
  const upsertTorrent = useTorrentStore((state) => state.upsertTorrent);
  const [magnetURI, setMagnetURI] = useState('');
  const [uploadFile, setUploadFile] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  async function handleMagnetSubmit(event) {
    event.preventDefault();
    setBusy(true);
    setError('');

    try {
      const torrent = await addMagnet(magnetURI);
      upsertTorrent(torrent);
      navigate(`/torrents/${torrent.id}`);
    } catch (requestError) {
      setError(getApiError(requestError));
    } finally {
      setBusy(false);
    }
  }

  async function handleFileSubmit(event) {
    event.preventDefault();
    if (!uploadFile) {
      setError('Select a .torrent file first');
      return;
    }

    setBusy(true);
    setError('');

    try {
      const torrent = await addTorrentFile(uploadFile);
      upsertTorrent(torrent);
      navigate(`/torrents/${torrent.id}`);
    } catch (requestError) {
      setError(getApiError(requestError));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
      <section className="glass-panel rounded-[32px] p-6 sm:p-8">
        <div className="flex items-center gap-3">
          <div className="rounded-2xl bg-highlight/10 p-3 text-highlight">
            <Magnet className="h-5 w-5" />
          </div>
          <div>
            <h3 className="font-display text-2xl font-semibold text-white">Add magnet link</h3>
            <p className="mt-1 text-sm text-subtle">Paste a legal torrent magnet URI to begin downloading from the server.</p>
          </div>
        </div>

        <form className="mt-6 space-y-4" onSubmit={handleMagnetSubmit}>
          <Input
            label="Magnet URI"
            placeholder="magnet:?xt=urn:btih:..."
            value={magnetURI}
            onChange={(event) => setMagnetURI(event.target.value)}
          />
          <Button type="submit" disabled={busy || !magnetURI.trim()}>
            {busy ? 'Adding magnet...' : 'Add magnet'}
          </Button>
        </form>
      </section>

      <section className="glass-panel rounded-[32px] p-6 sm:p-8">
        <div className="flex items-center gap-3">
          <div className="rounded-2xl bg-accent/10 p-3 text-accent">
            <FileUp className="h-5 w-5" />
          </div>
          <div>
            <h3 className="font-display text-2xl font-semibold text-white">Upload .torrent file</h3>
            <p className="mt-1 text-sm text-subtle">Files are staged in your OpenFlux upload folder before the download starts.</p>
          </div>
        </div>

        <form className="mt-6 space-y-4" onSubmit={handleFileSubmit}>
          <label className="block rounded-[24px] border border-dashed border-white/15 bg-white/4 p-6 text-center">
            <input
              type="file"
              accept=".torrent"
              onChange={(event) => setUploadFile(event.target.files?.[0] || null)}
              className="hidden"
            />
            <p className="text-sm text-white">{uploadFile ? uploadFile.name : 'Click to select a .torrent file'}</p>
            <p className="mt-2 text-xs text-subtle">Maximum upload size: 2 MB</p>
          </label>
          <Button type="submit" variant="secondary" disabled={busy || !uploadFile}>
            {busy ? 'Uploading...' : 'Upload torrent file'}
          </Button>
        </form>
      </section>

      <section className="glass-panel rounded-[32px] p-6 sm:p-8 xl:col-span-2">
        <div className="flex items-start gap-3">
          <div className="rounded-2xl bg-warning/10 p-3 text-warning">
            <AlertTriangle className="h-5 w-5" />
          </div>
          <div>
            <h3 className="font-display text-2xl font-semibold text-white">Legal usage reminder</h3>
            <p className="mt-2 max-w-3xl text-sm leading-7 text-subtle">
              OpenFlux does not include torrent search, site scraping, or copyrighted content shortcuts. Use it for Linux ISOs,
              public domain media, open datasets, and torrent files you are authorized to download.
            </p>
          </div>
        </div>
        {error ? <p className="mt-5 text-sm text-danger">{error}</p> : null}
      </section>
    </div>
  );
}
