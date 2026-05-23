import { useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AlertTriangle, FileUp, Magnet, UploadCloud, X } from 'lucide-react';
import Button from '../components/common/Button.jsx';
import Input from '../components/common/Input.jsx';
import { addMagnet, addTorrentFile } from '../services/torrent.api.js';
import { useTorrentStore } from '../store/torrent.store.js';
import { getApiError } from '../services/api.service.js';

export default function AddTorrent() {
  const navigate = useNavigate();
  const upsertTorrent = useTorrentStore((state) => state.upsertTorrent);
  const fileInputRef = useRef(null);
  const [magnetURI, setMagnetURI] = useState('');
  const [uploadFile, setUploadFile] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [dragActive, setDragActive] = useState(false);

  function isTorrentFile(file) {
    return Boolean(file?.name?.toLowerCase().endsWith('.torrent'));
  }

  function selectUploadFile(file) {
    if (!file) {
      setUploadFile(null);
      return;
    }

    if (!isTorrentFile(file)) {
      setError('Only .torrent files are supported');
      setUploadFile(null);
      return;
    }

    setError('');
    setUploadFile(file);
  }

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

  function handleDragOver(event) {
    event.preventDefault();
    setDragActive(true);
  }

  function handleDragLeave(event) {
    event.preventDefault();
    if (event.currentTarget.contains(event.relatedTarget)) {
      return;
    }

    setDragActive(false);
  }

  function handleDrop(event) {
    event.preventDefault();
    setDragActive(false);
    selectUploadFile(event.dataTransfer.files?.[0] || null);
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
          <input
            ref={fileInputRef}
            type="file"
            accept=".torrent"
            onChange={(event) => selectUploadFile(event.target.files?.[0] || null)}
            className="hidden"
          />

          <div
            onDragOver={handleDragOver}
            onDragEnter={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            className={[
              'rounded-[28px] border border-dashed p-5 sm:p-6 transition',
              dragActive
                ? 'border-accent/70 bg-accent/10'
                : 'border-white/15 bg-white/4 hover:border-white/25 hover:bg-white/6'
            ].join(' ')}
          >
            <div className="flex flex-col items-center text-center">
              <div
                className={[
                  'rounded-[22px] p-4 transition',
                  dragActive ? 'bg-accent/15 text-accent' : 'bg-white/6 text-white'
                ].join(' ')}
              >
                <UploadCloud className="h-7 w-7" />
              </div>

              <h4 className="mt-4 font-display text-xl font-semibold text-white">
                {dragActive ? 'Drop your .torrent file here' : 'Drag and drop a .torrent file'}
              </h4>
              <p className="mt-2 max-w-md text-sm leading-6 text-subtle">
                Upload a torrent file directly from your device or browse for one manually. OpenFlux stages it in the
                upload folder before the download starts.
              </p>

              <div className="mt-5 flex flex-wrap items-center justify-center gap-3">
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => fileInputRef.current?.click()}
                >
                  <FileUp className="h-4 w-4" />
                  Browse files
                </Button>
                <span className="text-xs uppercase tracking-[0.18em] text-subtle">.torrent only • max 2 MB</span>
              </div>
            </div>

            {uploadFile ? (
              <div className="mt-5 rounded-[22px] border border-white/10 bg-white/6 p-3 sm:p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-xs uppercase tracking-[0.18em] text-subtle">Selected file</p>
                    <p className="mt-1 break-words text-sm font-medium text-white">{uploadFile.name}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setUploadFile(null);
                      if (fileInputRef.current) {
                        fileInputRef.current.value = '';
                      }
                    }}
                    className="rounded-xl border border-white/10 bg-white/5 p-2 text-subtle transition hover:bg-white/10 hover:text-white"
                    aria-label="Remove selected file"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              </div>
            ) : null}
          </div>

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
