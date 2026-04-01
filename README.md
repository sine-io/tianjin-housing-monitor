# Tianjin Housing Monitor

Static Tianjin housing monitor workspace. Data is collected into JSON, copied to `site/public/data`, and served as a Vite-built static dashboard.

For day-to-day operations, see the runbook in [`docs/RUNBOOK.md`](docs/RUNBOOK.md).

## Requirements

- Node.js 22
- npm 10+
- Playwright Chromium for local e2e runs: `npx playwright install --with-deps chromium`

The GitHub workflows in [`.github/workflows/collect.yml`](.github/workflows/collect.yml), [`.github/workflows/manual-input.yml`](.github/workflows/manual-input.yml), and [`.github/workflows/deploy-pages.yml`](.github/workflows/deploy-pages.yml) all use Node 22. Use the same version locally to avoid drift.

## Local Commands

Install dependencies:

```bash
npm ci
```

Run the core checks:

```bash
npm run test
npm run typecheck
```

Collect fresh upstream snapshots:

```bash
npm run collect
```

Build derived data and the static site:

```bash
npm run build
```

Preview the built app locally:

```bash
npm run preview -- --host 127.0.0.1 --strictPort
```

Run the Playwright smoke test against the built app:

```bash
npm run build
npm run test:e2e -- tests/e2e/site-smoke.spec.ts
```

## GitHub Pages

GitHub Pages deployment is already defined in [`.github/workflows/deploy-pages.yml`](.github/workflows/deploy-pages.yml).

To enable it in a repository:

1. Push this repo to GitHub and keep the default branch as `main`.
2. In GitHub, open `Settings -> Pages`.
3. Set `Source` to `GitHub Actions`.
4. Ensure Actions are enabled for the repository.
5. Push a commit that changes `site/**`, `site/public/data/**`, `data/config/**`, `data/series/**`, or `data/reports/**`.

The workflow builds `dist/` and deploys it with the official Pages actions.

## Issue Forms

The manual sample form lives at [`.github/ISSUE_TEMPLATE/manual-sample.yml`](.github/ISSUE_TEMPLATE/manual-sample.yml). The ingestion workflow lives at [`.github/workflows/manual-input.yml`](.github/workflows/manual-input.yml).

To configure issue forms:

1. Enable `Issues` in the repository settings.
2. Keep the form file under `.github/ISSUE_TEMPLATE/` with the `.yml` extension.
3. Update the community and segment dropdown options in `manual-sample.yml` whenever the monitored config changes.
4. Keep the field markers unchanged unless you also update the validation block in `manual-input.yml`.

The workflow only accepts issues from `OWNER`, `MEMBER`, or `COLLABORATOR` accounts and rejects bodies that do not match the issue form markers.

## Fixture Mode

Fixture mode is for deterministic local verification without upstream network access. `npm run collect -- --fixture` reads HTML from `tests/fixtures` instead of live sources.

Safe usage:

```bash
tmp_runs_dir="$(mktemp -d)"
npm run collect -- --fixture tests/fixtures --runs-dir "$tmp_runs_dir/runs"
```

Notes:

- Always pass `--runs-dir` to a temporary directory when using fixtures. Without it, `collect` writes to `data/runs`.
- `npm run collect -- --fixture` with no path uses `tests/fixtures` by default.
- Fixture mode is appropriate for tests and dry runs, not for refreshing production data.
