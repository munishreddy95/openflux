# Security Policy

## Supported Scope

OpenFlux is self-hosted software. Security work should prioritize:

- Authentication and session handling
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
- Private admin account management
- Firewall restrictions
- Storage limits
- Process monitoring

## Current Security Controls

The current authentication model includes:

- Password hashing before storage
- Session cookies marked `HttpOnly`
- `SameSite=Strict` session cookies
- Admin-only access to system usage, settings, and user creation
- User ownership scoping for torrents and completed media
- Temporary password issuance for user recovery
- Forced password change after temporary-password login

## Current Limitations

OpenFlux still depends on operator hardening around the application.

Current limitations include:

- No multi-factor authentication
- No email-based password recovery
- No external identity provider integration
- No built-in rate limiting yet
- No account lockout policy yet

If you run it publicly, you are still responsible for the surrounding access controls and infrastructure policy.
