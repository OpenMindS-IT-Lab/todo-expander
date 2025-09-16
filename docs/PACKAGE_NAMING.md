# Package Naming and Distribution Strategy

## Executive Summary

After comprehensive availability checks across NPM, JSR, GitHub, and binary distribution channels, we have established the following naming strategy for todo-expander package distribution.

## Final Package Names

### NPM Registry

- **Primary choice**: `todo-expander` ✅ **AVAILABLE**
- **Fallback options**:
  - `todo-expand` ✅ **AVAILABLE**
  - `todo-expander-cli` ✅ **AVAILABLE**

### JSR (JavaScript Registry for Deno)

- **Recommended**: `@saladin/todo-expander` (using personal scope)
- **Alternative**: `@openminds-it/todo-expander` (organizational scope)
- **Future option**: `@todo-expander/cli` (dedicated org scope - requires manual setup)

### Binary Distribution

- **CLI binary name**: `todo-expand` (consistent with current deno.json task)
- **GitHub Release assets**: `todo-expand-{os}-{arch}` (e.g., `todo-expand-darwin-x64`)

### Repository

- **Current**: `git@github.com:OpenMindS-IT-Lab/todo-expander.git` ✅ **CONFIRMED**

## Availability Check Results

### NPM Registry Status

```bash
# All checked packages return 404 Not Found - AVAILABLE
npm view todo-expander     # ✅ AVAILABLE
npm view todo-expand       # ✅ AVAILABLE  
npm view todo-expander-cli # ✅ AVAILABLE
```

### Competing/Similar Packages

Based on `npm search "todo expand"`, no direct naming conflicts found. Related packages are:

- `dotenv-expand` - Environment variable expansion (different domain)
- Various `expand-*` utilities - Template/path expansion (different domain)
- No packages specifically handling TODO comment expansion

### Binary Name Conflicts

```bash
which todo-expand  # Not found - AVAILABLE
brew search todo   # No conflicts found - AVAILABLE
```

Existing todo-related tools in ecosystem:

- `todo-txt` - Different format/approach
- `todoist-cli` - SaaS integration tool
- `todoman` - Calendar-based todos
- None conflict with our binary name `todo-expand`

### JSR Registry

- `@todo-expander` scope appears available (scope not found)
- `@saladin` scope appears available (scope not found)
- Need to verify during actual publishing setup

## Distribution Strategy

### 1. NPM Package (`@openminds-it-lab/todo-expander`)

**Target users**: Node.js/npm ecosystem developers
**Installation**:

```bash
npm install --save-dev @openminds-it-lab/todo-expander
# or globally
npm install -g @openminds-it-lab/todo-expander
```

**Implementation**: Use `dnt` for Deno-to-Node transpilation (scoped package, provenance enabled)

### 2. JSR Package (`@openminds-it-lab/todo-expander`)

**Target users**: Deno ecosystem developers
**Installation**:

```bash
deno add jsr:@openminds-it-lab/todo-expander
# or direct import
import { processFile } from "jsr:@openminds-it-lab/todo-expander";
```

**Implementation**: Native Deno publishing under the organization scope

### 3. Binary Distribution (`todo-expand`)

**Target users**: Any developer, regardless of runtime
**Installation**:

```bash
# GitHub Releases
curl -L -o todo-expand https://github.com/OpenMindS-IT-Lab/todo-expander/releases/latest/download/todo-expand-$(uname -s | tr '[:upper:]' '[:lower:]')-$(uname -m)
chmod +x todo-expand

# Future: Package managers
brew install todo-expand  # (after brew formula submission)
```

**Implementation**: `deno compile` with GitHub Actions automation

## Package Metadata

### Common Fields

```json
{
  "name": "todo-expander",
  "version": "1.0.0",
  "description": "Transform simple TODO comments into structured, AI-ready task briefs",
  "keywords": [
    "todo",
    "ai",
    "task",
    "comment",
    "expansion",
    "cli",
    "automation"
  ],
  "author": "Saladin <email@example.com>",
  "license": "MIT",
  "repository": {
    "type": "git",
    "url": "git+https://github.com/OpenMindS-IT-Lab/todo-expander.git"
  },
  "bugs": {
    "url": "https://github.com/OpenMindS-IT-Lab/todo-expander/issues"
  },
  "homepage": "https://github.com/OpenMindS-IT-Lab/todo-expander#readme"
}
```

### NPM-Specific

```json
{
  "type": "module",
  "bin": {
    "todo-expand": "./bin/todo-expand.js"
  },
  "files": [
    "bin/",
    "dist/",
    "schema/",
    "prompts/",
    "README.md",
    "LICENSE"
  ],
  "engines": {
    "node": ">=18.0.0"
  }
}
```

### JSR-Specific (deno.json)

```json
{
  "name": "@saladin/todo-expander",
  "version": "1.0.0",
  "exports": {
    ".": "./bin/todo-expand.ts"
  },
  "publish": {
    "include": [
      "bin/",
      "src/",
      "prompts/",
      "schema/",
      "README.md",
      "LICENSE",
      "deno.json"
    ]
  }
}
```

## Risk Assessment

### Low Risk

- ✅ All primary names available across registries
- ✅ No naming conflicts with existing tools
- ✅ Repository already established
- ✅ Binary name follows CLI conventions

### Medium Risk

- ⚠️ JSR scope ownership needs verification during setup
- ⚠️ NPM organization scopes might be claimed by others

### Mitigation Strategies

1. **Reserve names early**: Publish placeholder packages if needed
2. **Document ownership**: Create GitHub issue tracking package claims
3. **Backup naming**: Maintain list of acceptable alternatives
4. **Consistent branding**: Use same base name across platforms where possible

## Implementation Timeline

### Phase 1: Core Package Setup

1. NPM package using `todo-expander` name
2. Basic JSR package using `@saladin/todo-expander`
3. GitHub binary releases using `todo-expand` name

### Phase 2: Enhanced Distribution

1. Organizational JSR scope (`@openminds-it/todo-expander`)
2. Brew formula submission
3. Dedicated organization scope consideration

### Phase 3: Ecosystem Integration

1. Package manager integrations (winget, apt, etc.)
2. Editor extension marketplaces
3. CI/CD marketplace listings

## Decision Log

**Date**: 2025-09-16
**Decision**: Publish only under organization scopes
**Details**:

- NPM: `@openminds-it-lab/todo-expander` (primary)
- JSR: `@openminds-it-lab/todo-expander` (primary)
- Legacy packages deprecated/yanked: unscoped `todo-expander` on NPM and `@saladin/todo-expander` on JSR

**Binary name**: `todo-expand` (unchanged)

---

## Action Items

- [ ] Create GitHub issue to track package name reservations
- [ ] Set up NPM organization account if desired
- [ ] Verify JSR scope availability during first publish attempt
- [ ] Document package ownership and access credentials securely
- [ ] Plan registry ownership transfer process if needed

**Status**: ✅ COMPLETED - Package naming strategy finalized
**Next**: Proceed to task #2 - Config file system implementation
