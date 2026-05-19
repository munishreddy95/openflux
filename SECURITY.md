# Security Policy

## Supported Scope

OpenFlux is self-hosted software. Security work should prioritize:

- Path traversal protection
- Upload validation
- Reverse-proxy deployment safety
- State and storage integrity
- Multi-process runtime behavior
- Real-time socket exposure

## Reporting a Vulnerability

If you discover a security issue, do not open a public issue with exploit details first.

Instead, report it privately to the project maintainer through the maintainer contact method used for the repository or package distribution.

A useful report should include:

- A clear description of the issue
- Impact
- Reproduction steps
- Affected version or commit
- Suggested mitigation if known

## Deployment Notes

OpenFlux should not be exposed directly to the public internet without additional controls.

Recommended production controls:

- HTTPS
- Reverse proxy
- Authentication
- Firewall restrictions
- Storage limits
- Process monitoring

## Current Limitations

At the current stage, OpenFlux should be treated as self-hosted software that still benefits from operator hardening. If you run it publicly, you are responsible for the surrounding access controls and infrastructure policy.
