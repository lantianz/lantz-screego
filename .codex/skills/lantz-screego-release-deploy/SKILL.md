---
name: lantz-screego-release-deploy
description: Release and deployment handoff workflow for this lantz-screego repository. Use when preparing a version tag, validating Go and UI builds, pushing main and release tags to GitHub, waiting for GHCR image publication, or giving Docker/1Panel update commands for the Screego-based screen sharing deployment.
---

# lantz-screego Release Deploy

## Scope

Use this skill only for this repository. Keep the workflow deterministic, preserve the Docker/GitHub Actions release path, and avoid running production Docker actions from the Windows local machine.

Assume:
- Local repository: `E:\AProject\self\lantz-screego`
- Branch: `main`
- Go: `1.26.x`
- GitHub Actions Node: `25`
- UI package manager: `yarn`
- Image registry pattern: `ghcr.io/<github-owner>/<github-repo>`

Version policy:
- The release source of truth is the Git tag, using `vX.Y.Z`.
- GoReleaser uses `{{ .RawVersion }}` for image tags, so tag `vX.Y.Z` publishes image tag `X.Y.Z`.
- Do not invent package-version sync scripts; this project has no root package release script.
- If a local release tag was created before the final commit is ready, do not push it. Move the unpushed local tag to the final release commit first.

## Local Release Workflow

1. Check the working tree before releasing:

```powershell
git status --short --branch
```

2. Run the required local verification. Do not run Docker locally on Windows unless the user explicitly asks for it.

```powershell
cd ui
yarn build
yarn testformat
cd ..
go test ./...
go build ./...
```

3. Create the release tag on the final commit:

```powershell
git tag -a vX.Y.Z -m "Release vX.Y.Z"
git tag --points-at HEAD
git status --short --branch
```

4. Push `main` and the tag:

```powershell
git push origin main
git push origin vX.Y.Z
```

Pushing a `vX.Y.Z` tag runs the GitHub Actions build workflow and GoReleaser publish step.

## GitHub Image Confirmation

After pushing, verify the tag image exists before telling the user to update the server:

```powershell
docker manifest inspect ghcr.io/<github-owner>/<github-repo>:X.Y.Z
```

If Docker is not available locally, ask the user to confirm the GitHub Actions `build` workflow passed before giving production update commands. Do not claim the image is published until it has been verified.

Expected GoReleaser image tags include:
- `ghcr.io/<github-owner>/<github-repo>:X.Y.Z`
- `ghcr.io/<github-owner>/<github-repo>:unstable`
- `ghcr.io/<github-owner>/<github-repo>:<major>`
- Per-architecture tags such as `amd64-X.Y.Z`, `arm64-X.Y.Z`, and `armv7-X.Y.Z`

## Server Handoff Commands

Give the user commands with the exact released version and actual server path/image once known. Use placeholders only when the repository owner or server path is not confirmed.

```bash
cd /opt/1panel/apps/lantz-screego/lantz-screego

git pull --ff-only
./deploy.sh

curl http://127.0.0.1:<app-port>/health
curl -s http://127.0.0.1:<app-port>/ | head -40
```

Expected health response includes `"status":"up"`. The public entry should return the frontend HTML, not a placeholder response.

For first deployment, initialize `deploy/.env` with environment variables:

```bash
LANTZ_SCREEGO_DOMAIN=<public-domain> ./deploy.sh
```

Or use `LANTZ_SCREEGO_EXTERNAL_IP=<public-ip> ./deploy.sh` when no domain is available. Existing `deploy/.env` is the server-side source of truth for image, version, domain/IP, ports, and auth mode.

## Guardrails

- Never remove or recreate server config, users, or data files.
- Never suggest `docker compose down -v` for routine updates.
- Do not run local Docker image builds on Windows unless explicitly requested.
- Do not change Go, Node, GoReleaser, or workflow versions unless the user explicitly requests it and compatibility is verified.
- Keep release docs version examples generic as `X.Y.Z`; do not hard-code a historical tag.
- If 1Panel or a reverse proxy terminates HTTPS, keep Screego app settings aligned with that deployment and do not change production domains or ports without confirmation.
