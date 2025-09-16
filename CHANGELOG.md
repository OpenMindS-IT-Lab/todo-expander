# Changelog

All notable changes to this project will be documented in this file. See [standard-version](https://github.com/conventional-changelog/standard-version) for commit guidelines.

## [1.0.2](https://github.com/OpenMindS-IT-Lab/todo-expander/compare/1.0.1...1.0.2) (2025-09-16)


### Bug Fixes

* make publishing workflows resilient to already-published versions ([e2b1d90](https://github.com/OpenMindS-IT-Lab/todo-expander/commit/e2b1d900f90f5783a5c54bc2a91e4a32dda4e99d))

## [1.0.1](https://github.com/OpenMindS-IT-Lab/todo-expander/compare/1.0.0...1.0.1) (2025-09-16)

### Bug Fixes

- sync version to 1.0.0 and improve JSR publishing ([3dc5cbb](https://github.com/OpenMindS-IT-Lab/todo-expander/commit/3dc5cbb40e75c173c7045acabb148e698ff4c258))

### Miscellaneous Chores

- update npm-scoped package to version 1.0.0 ([7d796e0](https://github.com/OpenMindS-IT-Lab/todo-expander/commit/7d796e00ec43453acfbb5f38d64c3ce371e0d1ec))

## [1.0.0](https://github.com/OpenMindS-IT-Lab/todo-expander/compare/0.1.1...1.0.0) (2025-09-16)

### ⚠ BREAKING CHANGES

- Migrate from personal packages to organization scopes
- Configuration file format now uses .todoexpandrc.json with new schema

### Features

- add comprehensive test suite and agent guidelines ([19f80d1](https://github.com/OpenMindS-IT-Lab/todo-expander/commit/19f80d1c49d13a326f93a04106d99eaf2d23d998))
- add playground file for testing TODO expansion behavior ([def3017](https://github.com/OpenMindS-IT-Lab/todo-expander/commit/def301715ff403092292c86773207853ea24f8b7))
- add Release Please automation and OpenMinds IT Lab organization scopes ([43aef55](https://github.com/OpenMindS-IT-Lab/todo-expander/commit/43aef55815c89eb26a4e38c7910cb128810ad8e7))
- add robust error handling and retry logic to LLM requests ([7cb459b](https://github.com/OpenMindS-IT-Lab/todo-expander/commit/7cb459bb66ca69da5fde60a86a1db3d61e8fff71))
- batch TODO prompts and reuse cache across files ([dd97375](https://github.com/OpenMindS-IT-Lab/todo-expander/commit/dd97375a67a73c03ace069f335cf557ea402a1d8))
- complete migration to [@openminds-it-lab](https://github.com/openminds-it-lab) organization scopes ([58a91f6](https://github.com/OpenMindS-IT-Lab/todo-expander/commit/58a91f6cfc7481fdbb2fd5a8dea833fd4ab614c1))
- initial implementation of todo-expander CLI tool ([ff3d993](https://github.com/OpenMindS-IT-Lab/todo-expander/commit/ff3d99377072a979f57bb8ed365e5cc10a17ab05))
- **npm:** enhance package.json for v0.1.1 release ([6aeffb2](https://github.com/OpenMindS-IT-Lab/todo-expander/commit/6aeffb27da4b907b6f484c1a15efd359541a28da))
- recreate npm-scoped package for organization distribution ([7823ee9](https://github.com/OpenMindS-IT-Lab/todo-expander/commit/7823ee9a1f8d21beb7cc2a8c792ba5dbd4406355))
- transform into comprehensive package with config system and NPM distribution ([f81377d](https://github.com/OpenMindS-IT-Lab/todo-expander/commit/f81377d20f7d130287de72b6ddfe3f011c90070d))

### Bug Fixes

- **ci:** use correct --ignore flag for deno lint ([63387fe](https://github.com/OpenMindS-IT-Lab/todo-expander/commit/63387fe149f165787c9401e46802120ddfa29c7d))
- configure Release Please for v4 compatibility ([eec8b28](https://github.com/OpenMindS-IT-Lab/todo-expander/commit/eec8b288f9d42d5f28229cea82d7562cb8288d14))
- configure Release Please for v4 compatibility ([e5fdec5](https://github.com/OpenMindS-IT-Lab/todo-expander/commit/e5fdec59cc7a4470a59b47948f5c8e571c9315e9))
- resolve Deno linting errors in npm-scoped package ([c704300](https://github.com/OpenMindS-IT-Lab/todo-expander/commit/c704300dec78d0020030d117ffd25bbf6452571e))
- simplify Release Please workflow configuration ([415a7ca](https://github.com/OpenMindS-IT-Lab/todo-expander/commit/415a7ca7d0ab13811cb5dc2d59131f335e97b335))

### Miscellaneous Chores

- add node_modules pattern to gitignore ([c8eb2e7](https://github.com/OpenMindS-IT-Lab/todo-expander/commit/c8eb2e70aafbbf09e5d50197807ec3b1955e3ab5))
- exclude npm-scoped directory from deno formatting ([e71864c](https://github.com/OpenMindS-IT-Lab/todo-expander/commit/e71864c1397c5c0a386d7956fb4b51029eb2d646))
- **fmt:** align formatting settings with telegram-gpt conventions ([d1d8910](https://github.com/OpenMindS-IT-Lab/todo-expander/commit/d1d89102f18a8c17683586dc7dcd9b1c1251264d))
- **githooks:** make pre-commit executable ([bc5c022](https://github.com/OpenMindS-IT-Lab/todo-expander/commit/bc5c022db04cbdf43abc62dd0f2eaa42eb03d898))
- ignore npm build artifacts ([64aab0c](https://github.com/OpenMindS-IT-Lab/todo-expander/commit/64aab0cb501143a6873658dcfbaa3d32f002ac19))
- initial commit ([156f36a](https://github.com/OpenMindS-IT-Lab/todo-expander/commit/156f36a52df0eeb0b7a7d86c5d4157acca4234ff))
- migrate to [@openminds-it-lab](https://github.com/openminds-it-lab) organization scope for JSR ([c1c7876](https://github.com/OpenMindS-IT-Lab/todo-expander/commit/c1c787607334ce2b8a76446083dcf178168dcc48))
- release automation (NPM/JSR/GitHub binaries) and naming finalization ([#3](https://github.com/OpenMindS-IT-Lab/todo-expander/issues/3)) ([768ddb2](https://github.com/OpenMindS-IT-Lab/todo-expander/commit/768ddb2f88782de7dc4849f2a6ffcf60ff1fc294))
- update .gitignore and remove dist/todo-expand ([e5de5c8](https://github.com/OpenMindS-IT-Lab/todo-expander/commit/e5de5c8ca42bbaf293f28a7d92b0539ebdf8e7d5))
- update deno.lock with CLI and dotenv dependencies ([e944294](https://github.com/OpenMindS-IT-Lab/todo-expander/commit/e944294c09403602f00eb07bba8ddb258c676a93))
- update dependencies in deno.lock ([b58e778](https://github.com/OpenMindS-IT-Lab/todo-expander/commit/b58e778c2957b8984daf1fcf2e398d5fc8642c15))

### Documentation

- add JSR organization setup documentation ([1a4dd53](https://github.com/OpenMindS-IT-Lab/todo-expander/commit/1a4dd5395e4015d385ac4b0c3cc511607f2678c4))
- **ci:** finalize org-scope docs and JSR publish include set ([4c60375](https://github.com/OpenMindS-IT-Lab/todo-expander/commit/4c60375fcfb3c22115344850621d83cdc3472894))
- **npm:** comprehensive README with migration guide and full documentation ([4a9e821](https://github.com/OpenMindS-IT-Lab/todo-expander/commit/4a9e821762c79131368cc1466b2a8285414934df))
- org-scope only\n\n- add .prettierrc\n- update hooks, naming docs, and JSR token usage\n- add webhooks notebook templates\n- ignore npm-scoped build output\n- build verified scoped npm tarball (dry run) ([de89134](https://github.com/OpenMindS-IT-Lab/todo-expander/commit/de89134bd2cffe6ad663b0631ba94db125f290e5))
- update CLI documentation and improve code comments ([db51448](https://github.com/OpenMindS-IT-Lab/todo-expander/commit/db514486ba551a459066d8ab580fd980d6f68a60))

### Styles

- format codebase with deno fmt and update lock file ([745c2e4](https://github.com/OpenMindS-IT-Lab/todo-expander/commit/745c2e489b9b51107493f78acb8d31fbd2daef2a))

### Code Refactoring

- remove duplicate prompt building code in renderPrompt ([512eab2](https://github.com/OpenMindS-IT-Lab/todo-expander/commit/512eab2bded2b9002dd6de71319eeaa31b1c4cc3))
- remove empty placeholder files ([cd06152](https://github.com/OpenMindS-IT-Lab/todo-expander/commit/cd06152015968ee23fc1957bd668a11a066d6850))
- scope-only publishing\n\n- remove unscoped npm builder and alias files\n- make scoped package self-contained\n- update deno tasks (prettier + scoped publish)\n- fix release workflow to publish scoped package only\n- update hooks and docs to point to org scope ([11100a6](https://github.com/OpenMindS-IT-Lab/todo-expander/commit/11100a694717a7f61659aba80ba610b4e2840430))

### Build System

- **release:** bump to 0.1.1 and sync npm version with deno.json ([ead56bd](https://github.com/OpenMindS-IT-Lab/todo-expander/commit/ead56bd77918cff48fd83f192667cd1329494054))

### Continuous Integration

- exclude npm-scoped directory from deno lint ([eca95bc](https://github.com/OpenMindS-IT-Lab/todo-expander/commit/eca95bc88cfac30a8eabade0ea610b01a98298b1))
- fix release workflow outputs, permissions, and tokens for scoped publish ([b2d52d1](https://github.com/OpenMindS-IT-Lab/todo-expander/commit/b2d52d13bfcc5348ae410eae08d86a58c6595f4d))
- release-please manifest mode ([c4f8fa3](https://github.com/OpenMindS-IT-Lab/todo-expander/commit/c4f8fa3dda943d12ee2d41135b6de632435faae2))

## [0.1.0](https://github.com/OpenMindS-IT-Lab/todo-expander/releases/tag/v0.1.0) (2025-01-16)

### Features

- Initial release with full release automation
- Cross-platform binary distribution (Linux, macOS, Windows)
- Multi-registry publishing (JSR, NPM, GitHub Releases)
- Comprehensive CI/CD workflows
- Release playbook and developer documentation

### Release Infrastructure

- **JSR**: `@saladin/todo-expander@0.1.0` published and verified
- **NPM**: `todo-expander@0.1.0` published (package name reserved)
- **GitHub Releases**: Cross-platform binaries for all supported platforms
- **CI/CD**: Automated testing, formatting, linting, and release workflows
- **Documentation**: Complete release playbook and troubleshooting guides
