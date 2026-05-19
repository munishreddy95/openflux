import { formatBytes, formatSpeed } from '../../utils/format.js';

function formatPeerSource(source = '') {
  const labels = {
    tracker: 'Tracker',
    dht: 'DHT',
    lsd: 'LSD',
    ut_pex: 'PEX',
    manual: 'Manual',
    incoming: 'Incoming'
  };

  return labels[source] || 'Incoming';
}

function formatPeerType(type = '') {
  const labels = {
    tcpIncoming: 'TCP in',
    tcpOutgoing: 'TCP out',
    utpIncoming: 'uTP in',
    utpOutgoing: 'uTP out',
    webrtc: 'WebRTC'
  };

  return labels[type] || type || 'Unknown';
}

function formatShortPeerId(peerId = '') {
  if (!peerId || peerId.length <= 18) {
    return peerId || 'Unknown peer id';
  }

  return `${peerId.slice(0, 10)}...${peerId.slice(-6)}`;
}

export default function PeerList({ torrent }) {
  const connectedPeers = torrent.connectedPeers ?? torrent.peers ?? 0;
  const totalPeers = torrent.peersTotal ?? connectedPeers;
  const peerConnections = torrent.peerConnections || [];

  if (peerConnections.length === 0) {
    return (
      <div className="rounded-[24px] border border-white/10 bg-white/4 p-5 text-sm text-subtle">
        {totalPeers > 0
          ? `OpenFlux has discovered ${totalPeers} peers, but none are connected right now.`
          : 'No live peer connections yet. Peer details will appear here once the swarm starts responding.'}
      </div>
    );
  }

  return (
    <div>
      <div className="overflow-hidden rounded-[24px] border border-white/10 bg-white/5">
        <div className="overflow-x-auto">
          <table className="min-w-[760px] w-full border-collapse">
            <thead className="bg-white/6">
              <tr className="text-left text-[11px] uppercase tracking-[0.18em] text-subtle">
                <th className="px-4 py-3 font-medium">Peer</th>
                <th className="px-4 py-3 font-medium">Route</th>
                <th className="px-4 py-3 font-medium">Role</th>
                <th className="px-4 py-3 font-medium">Down</th>
                <th className="px-4 py-3 font-medium">Up</th>
                <th className="px-4 py-3 font-medium">Transferred</th>
              </tr>
            </thead>
            <tbody>
              {peerConnections.map((peer) => (
                <tr key={peer.id} className="border-t border-white/8 align-top text-sm text-subtle">
                  <td className="px-4 py-3">
                    <p className="break-all font-medium text-white">{peer.label}</p>
                    {peer.peerId ? (
                      <p className="mt-1 break-all font-mono text-[11px] text-subtle">
                        {formatShortPeerId(peer.peerId)}
                      </p>
                    ) : null}
                  </td>
                  <td className="px-4 py-3">
                    <p className="text-white">{formatPeerSource(peer.source)}</p>
                    <p className="mt-1 text-xs text-subtle">{formatPeerType(peer.type)}</p>
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={
                        peer.isSeeder
                          ? 'inline-flex items-center rounded-full bg-accent/12 px-3 py-1 text-xs font-semibold text-accent ring-1 ring-accent/25'
                          : 'inline-flex items-center rounded-full bg-highlight/12 px-3 py-1 text-xs font-semibold text-highlight ring-1 ring-highlight/25'
                      }
                    >
                      {peer.isSeeder ? 'Seeder' : 'Peer'}
                    </span>
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-white">{formatSpeed(peer.downloadSpeed)}</td>
                  <td className="px-4 py-3 whitespace-nowrap text-white">{formatSpeed(peer.uploadSpeed)}</td>
                  <td className="px-4 py-3">
                    <p className="whitespace-nowrap text-white">↓ {formatBytes(peer.downloaded)}</p>
                    <p className="mt-1 whitespace-nowrap text-xs text-subtle">↑ {formatBytes(peer.uploaded)}</p>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {connectedPeers > peerConnections.length ? (
        <p className="mt-4 text-xs text-subtle">
          Showing the fastest {peerConnections.length} of {connectedPeers} connected peers.
        </p>
      ) : null}
    </div>
  );
}
