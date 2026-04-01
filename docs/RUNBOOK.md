# Tianjin Housing Monitor Runbook

- Repository: https://github.com/sine-io/tianjin-housing-monitor
- Site: https://www.sineio.top/tianjin-housing-monitor/
- Manual sample issue form: https://github.com/sine-io/tianjin-housing-monitor/issues/new?template=manual-sample.yml

## Workflows

| Workflow | Normal trigger | Trigger manually when |
| --- | --- | --- |
| `Collect` | Scheduled twice daily and `workflow_dispatch` | The site data looks stale, a scheduled run failed, or you want to retry collection after an upstream source issue. |
| `Weekly Report` | Scheduled every Monday and `workflow_dispatch` | Weekly summaries look stale or you need to rebuild reports after manual inputs were accepted. |
| `Deploy Pages` | Pushes to `main` that change site/data paths, successful `Collect`/`Weekly Report`, and `workflow_dispatch` | GitHub Pages is out of date, the deploy workflow did not auto-run, or you want to force a clean rebuild of the static site. |
| `Manual Input` | GitHub issue `opened`, `edited`, or `reopened` | Do not trigger manually; submit or update the manual sample issue form instead. |

## Minimal Health Check

1. Open the site and confirm it loads without a blank page or 404.
2. Check the latest runs for `Collect`, `Weekly Report`, and `Deploy Pages` in GitHub Actions.
3. Confirm recent data exists in `site/public/data/`, `data/series/`, and `data/reports/`.
4. Open the manual sample issue form and confirm it renders the expected fields.
5. If a manual sample was submitted, confirm a matching file exists under `data/manual/incoming/`.

## Common First Checks

- Site looks stale:
  Inspect whether the latest `Collect` or `Weekly Report` run committed fresh files, then check whether `Deploy Pages` ran after that.
- `Deploy Pages` did not run:
  Check whether the upstream run concluded successfully and whether the changed files were under `site/**`, `site/public/data/**`, `data/config/**`, `data/series/**`, or `data/reports/**`.
- Collection failed:
  Inspect the `Collect` logs first, especially Playwright Chromium install, upstream fetch failures, and the `npm run collect` step.
- Manual input did not ingest:
  Check that the issue was created from the manual sample form, that the reporter is `OWNER`, `MEMBER`, or `COLLABORATOR`, and that the issue body still contains the required markers.
- Data artifacts look inconsistent:
  Inspect `data/manual/incoming/`, `data/manual/accepted/`, `data/series/`, `data/reports/`, and `site/public/data/` together; the build pipeline writes across all of them.
- Jobs appear stuck or delayed:
  Check for queued runs behind the shared concurrency group `repo-main-write-serialization`.
