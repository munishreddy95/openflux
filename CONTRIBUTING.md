# Contributing

Thank you for contributing to OpenFlux.

## Development Setup

Requirements:

- Node.js `18.18.0` or newer
- npm

Install dependencies:

```bash
npm install
npm run client:install
```

Run the backend:

```bash
npm run dev
```

Run the frontend:

```bash
npm run client:dev
```

Build the frontend bundle:

```bash
npm run build
```

## Contribution Scope

Good contributions include:

- Bug fixes
- Deployment fixes
- UI improvements
- Accessibility improvements
- Performance improvements
- Tests
- Documentation updates

Please avoid adding piracy-oriented features such as:

- Torrent indexing
- Torrent scraping
- Copyrighted content catalogs
- Built-in links to unauthorized content

## Pull Request Guidance

Before opening a pull request:

- Keep changes focused
- Update docs when behavior changes
- Build the project locally
- Note any limits in your testing
- Avoid unrelated refactors in the same change

Include in the pull request description:

- What changed
- Why it changed
- How it was tested
- Any known follow-up work

## Code Style

- Prefer clear, direct code over clever abstractions
- Preserve existing project structure unless there is a strong reason to change it
- Keep UI changes responsive for desktop and mobile
- Treat production deployment and self-hosted stability as first-class concerns

## Reporting Bugs

When filing an issue, include:

- OpenFlux version
- Node.js version
- Host OS
- Whether the runtime was single-core or multi-core
- Reverse proxy details if deployed behind Nginx or another proxy
- Relevant logs or browser console errors
