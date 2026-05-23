[Unit]
Description=OpenFlux Self-Hosted Torrent Manager
After=network.target

[Service]
Type=simple
User=openflux
Group=openflux
WorkingDirectory={{INSTALL_DIR}}
Environment=HOME=/var/lib/openflux
ExecStart={{INSTALL_DIR}}/openflux start --host 0.0.0.0 --port 4001
Restart=on-failure
RestartSec=5

[Install]
WantedBy=multi-user.target
