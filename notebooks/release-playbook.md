# Release Playbook

This notebook contains key commands and procedures for managing releases of todo-expander.

## 🚀 Automated Releases with Release Please

**Release Please** is now configured to automate version management, changelog generation, and publishing.

### How It Works

1. **Conventional Commits**: Use conventional commit messages (feat:, fix:, docs:, etc.)
2. **Automated PRs**: Release Please creates PRs with version bumps and changelog updates
3. **Release Automation**: When PR is merged, automatic publishing to JSR, NPM, and GitHub Releases
4. **Binary Building**: Existing release-binaries.yml workflow still handles cross-platform binaries

### Conventional Commit Types

- `feat:` → Minor version bump, appears in "Features" section
- `fix:` → Patch version bump, appears in "Bug Fixes" section
- `docs:` → Patch version bump, appears in "Documentation" section
- `refactor:` → Patch version bump, appears in "Code Refactoring" section
- `perf:` → Patch version bump, appears in "Performance Improvements" section
- `test:` → Patch version bump, appears in "Tests" section
- `build:`, `ci:` → Patch version bump, appears in respective sections
- `chore:` → Patch version bump, hidden from changelog
- `BREAKING CHANGE:` → Major version bump (add to commit footer)

### Release Please Workflow

```bash
# 1. Make changes with conventional commits
git commit -m "feat: add new awesome feature"
git push origin main

# 2. Release Please automatically creates a PR with:
#    - Updated version in deno.json
#    - Updated CHANGELOG.md with new entries
#    - Proper semantic versioning

# 3. Review and merge the Release Please PR
# 4. Upon merge, automatic publishing occurs:
#    - JSR: deno publish
#    - NPM: npm publish
#    - GitHub Release: created with changelog
#    - Binaries: built via separate workflow
```

## Release Process Overview

### 1. Pre-release Preparation

```bash
# Ensure you're on main branch and up to date
git switch main
git pull --ff-only

# Run release preparation tasks
deno task fmt
deno task lint
deno task schema:validate
deno task build:cli

# Optional: health check (requires OPENAI_API_KEY)
deno task health:check
```

### 2. Version Bump and Publishing

#### JSR Publishing

```bash
# Update version in deno.json if needed
# Dry run to check for issues
deno publish --dry-run

# Publish to JSR
deno publish
```

#### NPM Publishing

```bash
# Build NPM package (scoped)
deno run -A scripts/build_npm_scoped.ts

# Publish to NPM (scoped; ensure you're logged in)
cd npm-scoped
npm publish --access public --provenance
cd ..
```

#### GitHub Release with Binaries

```bash
# Tag the release (signed)
VERSION=$(jq -r .version deno.json)
git tag -s "v$VERSION" -m "Release v$VERSION"
git push origin "v$VERSION"

# This triggers the GitHub Actions release workflow automatically
# The workflow builds binaries for all platforms and creates a GitHub release
```

### 3. Verification Commands

#### Verify GitHub Release Assets

```bash
# List all assets in the release
gh release view v$(jq -r .version deno.json) --json assets | jq '.assets[].name'

# Download and test binary (adjust platform as needed)
gh release download v$(jq -r .version deno.json) -p "todo-expand-*-macos-arm64"
chmod +x todo-expand-*-macos-arm64
./todo-expand-*-macos-arm64 --help
rm todo-expand-*-macos-arm64
```

#### Verify NPM Package

```bash
# Check published version (organization scope)
npm view @openminds-it-lab/todo-expander version

# Test installation
npm install -g @openminds-it-lab/todo-expander
todo-expand --help
```

#### Verify JSR Package

```bash
# Test library import (organization scope)
deno eval 'import * as todoExpander from "jsr:@openminds-it-lab/todo-expander"; console.log("Available exports:", Object.keys(todoExpander))'
```

## GitHub Actions Workflows

### CI Workflow (.github/workflows/ci.yml)

- **Triggers**: Pull requests, pushes to main
- **Concurrency**: 1 per workflow/ref
- **Steps**: format check, lint, schema validation, compile test
- **Comments**: Posts CI status on PRs

### Release Workflow (.github/workflows/release-binaries.yml)

- **Triggers**: Push to tags matching `v*.*.*`, manual dispatch
- **Concurrency**: 1 per workflow/ref
- **Builds**: Linux x64, macOS x64/ARM64, Windows x64
- **Outputs**: Binaries attached to GitHub release

## Environment Variables

Current workflow environment:

- `DENO_VERSION`: 2.x (updated from original 1.x)
- Binary naming: `todo-expand-v{version}-{os}-{arch}`

## 📦 Package Information

### Organization Packages (Primary)

- **CLI Binary**: `todo-expand`
- **JSR**: `@openminds-it-lab/todo-expander`
- **NPM**: `@openminds-it-lab/todo-expander`
- **GitHub**: Binary releases at `v{version}` tags

### Legacy Packages (Removed/Deprecated)

- JSR Personal: `@saladin/todo-expander` — removed/deprecated in favor of `@openminds-it-lab/todo-expander`
- NPM Unscoped: `todo-expander` — removed/deprecated in favor of `@openminds-it-lab/todo-expander`

Note: All new installations should use the organization-scoped packages above.

## Troubleshooting

### JSR Publishing Issues

- Ensure all imports use JSR-compatible URLs (`jsr:@std/...`)
- Add explicit return types to exported functions
- Run `deno publish --dry-run` first

### NPM Package Issues

- NPM package may have JSR dependency issues when executed via npx
- This is expected due to dnt build process with JSR imports
- Core goal achieved: package name is reserved

### GitHub Actions Issues

- Ensure Deno version is 2.x compatible with lockfile
- Check that `dist/` directory creation is included in workflows
- Verify workflow permissions are correct

### Workflow Optimizations (Future)

Consider implementing:

1. **Environment variables** in workflows to reduce duplication
2. **Reusable workflows** for binary building
3. **Release automation** with Release Please for conventional commits
4. **Branch protection** with signed commit requirements

## Quick Reference Commands

### Automated Releases (Recommended)

```bash
# 1. Make changes with conventional commits
git commit -S -m "feat: add awesome new feature"
git push origin main

# 2. Wait for Release Please PR, review and merge
# 3. Automated publishing happens on merge

# Manual verification after automated release
gh release list
npm view @openminds-it-lab/todo-expander version
deno eval 'import * as t from "jsr:@openminds-it-lab/todo-expander"; console.log("OK")'
```

### Manual Releases (Legacy)

```bash
# Full manual release process (use only if automated release fails)
deno task fmt && deno task lint
deno publish --dry-run && deno publish
deno run -A scripts/build_npm_scoped.ts && cd npm-scoped && npm publish --access public --provenance && cd ..
git tag -s "v$(jq -r .version deno.json)" -m "Release v$(jq -r .version deno.json)"
git push origin "v$(jq -r .version deno.json)"
```

### Organization Scope Commands

```bash
# NPM organization management
npm org ls @openminds-it-lab
npm org set @openminds-it-lab <username> <role>

# Future JSR scope setup (when available)
# deno publish --scope=@openminds-it-lab
```
