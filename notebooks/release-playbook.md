# Release Playbook

This notebook contains key commands and procedures for managing releases of todo-expander.

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
# Build NPM package
deno task build:npm
deno task pack:npm

# Publish to NPM (ensure you're logged in)
cd npm
npm publish --access public
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
# Check published version
npm view todo-expander version

# Test installation (may have JSR dependency issues - expected)
npx -y todo-expander --help || echo "NPM package name reserved successfully"
```

#### Verify JSR Package

```bash
# Test library import
deno eval 'import * as todoExpander from "jsr:@saladin/todo-expander"; console.log("Available exports:", Object.keys(todoExpander))'
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

## Package Information

- **CLI Binary**: `todo-expand`
- **Package Name**: `todo-expander` (all registries)
- **JSR**: `@saladin/todo-expander`
- **NPM**: `todo-expander` (unscoped, reserved)
- **GitHub**: Binary releases at `v{version}` tags

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

```bash
# Full release process
deno task fmt && deno task lint
deno publish --dry-run && deno publish
deno task build:npm && cd npm && npm publish --access public && cd ..
git tag -s "v$(jq -r .version deno.json)" -m "Release v$(jq -r .version deno.json)"
git push origin "v$(jq -r .version deno.json)"

# Verification
gh release list
npm view todo-expander version
deno eval 'import * as t from "jsr:@saladin/todo-expander"; console.log("OK")'
```
