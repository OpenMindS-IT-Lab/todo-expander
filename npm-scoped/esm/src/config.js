import * as dntShim from "../_dnt.shims.js";
import { exists } from '../deps/jsr.io/@std/fs/1.0.19/mod.js';
import { dirname, join } from '../deps/jsr.io/@std/path/1.1.2/mod.js';
/**
 * Known configuration keys for validation.
 */
const VALID_CONFIG_KEYS = new Set([
    '$schema',
    'include',
    'exclude',
    'style',
    'sections',
    'model',
    'endpoint',
    'timeout',
    'concurrency',
    'contextLines',
    'cache',
    'format',
    'strict',
    'print',
    'maxFileKB',
    'verboseLogs',
    'retries',
    'retryBackoffMs',
    'perFileTimeoutMs',
]);
/**
 * Get the global configuration directory path based on the current OS.
 * Uses XDG_CONFIG_HOME on Unix systems, falls back to standard locations.
 */
function getGlobalConfigDir() {
    // Respect XDG_CONFIG_HOME if set
    const xdgConfig = dntShim.Deno.env.get('XDG_CONFIG_HOME');
    if (xdgConfig) {
        return join(xdgConfig, 'todo-expand');
    }
    const home = dntShim.Deno.env.get('HOME') || dntShim.Deno.env.get('USERPROFILE');
    if (!home) {
        throw new Error('Unable to determine home directory for global config');
    }
    // Platform-specific config directories
    if (dntShim.Deno.build.os === 'windows') {
        const appData = dntShim.Deno.env.get('APPDATA');
        return appData
            ? join(appData, 'todo-expand')
            : join(home, 'AppData', 'Roaming', 'todo-expand');
    }
    // macOS and Linux
    return join(home, '.config', 'todo-expand');
}
/**
 * Find the nearest .todoexpandrc.json file by walking up the directory tree.
 * Starts from the given directory and walks up to the root.
 */
async function findProjectConfig(startDir) {
    let currentDir = startDir;
    const configFileName = '.todoexpandrc.json';
    while (true) {
        const configPath = join(currentDir, configFileName);
        if (await exists(configPath)) {
            return configPath;
        }
        const parentDir = dirname(currentDir);
        if (parentDir === currentDir) {
            // Reached the root directory
            break;
        }
        currentDir = parentDir;
    }
    return null;
}
/**
 * Validate and sanitize a configuration object loaded from a file.
 * Checks for unknown keys and validates types where possible.
 */
function validateConfig(raw, source) {
    const warnings = [];
    const errors = [];
    const config = {};
    if (typeof raw !== 'object' || raw === null || Array.isArray(raw)) {
        errors.push(`${source}: Configuration must be a JSON object`);
        return { config: {}, warnings, errors };
    }
    const obj = raw;
    // Check for unknown keys
    for (const key of Object.keys(obj)) {
        if (!VALID_CONFIG_KEYS.has(key)) {
            warnings.push(`${source}: Unknown configuration key '${key}' (will be ignored)`);
            continue;
        }
        const value = obj[key];
        // Type validation for specific fields
        switch (key) {
            case 'include':
            case 'exclude':
            case 'sections':
                if (Array.isArray(value) && value.every((v) => typeof v === 'string')) {
                    ;
                    config[key] = value;
                }
                else {
                    errors.push(`${source}: '${key}' must be an array of strings`);
                }
                break;
            case 'style':
                if (value === 'succinct' || value === 'verbose') {
                    config.style = value;
                }
                else {
                    errors.push(`${source}: 'style' must be 'succinct' or 'verbose'`);
                }
                break;
            case '$schema':
                // JSON Schema reference - ignore but don't warn
                break;
            case 'model':
            case 'endpoint':
                if (typeof value === 'string') {
                    config[key] = value;
                }
                else {
                    errors.push(`${source}: '${key}' must be a string`);
                }
                break;
            case 'timeout':
            case 'concurrency':
            case 'contextLines':
            case 'maxFileKB':
            case 'retries':
            case 'retryBackoffMs':
            case 'perFileTimeoutMs':
                if (typeof value === 'number' && value >= 0) {
                    config[key] = value;
                }
                else {
                    errors.push(`${source}: '${key}' must be a non-negative number`);
                }
                break;
            case 'cache':
            case 'format':
            case 'strict':
            case 'print':
            case 'verboseLogs':
                if (typeof value === 'boolean') {
                    config[key] = value;
                }
                else {
                    errors.push(`${source}: '${key}' must be a boolean`);
                }
                break;
            default:
                // This shouldn't happen due to the VALID_CONFIG_KEYS check above
                warnings.push(`${source}: Unhandled configuration key '${key}'`);
        }
    }
    return { config, warnings, errors };
}
/**
 * Load and parse a configuration file, returning null if it doesn't exist.
 * Handles JSON parsing errors and validation.
 */
async function loadConfigFile(filePath) {
    if (!(await exists(filePath))) {
        return null;
    }
    try {
        const content = await dntShim.Deno.readTextFile(filePath);
        const raw = JSON.parse(content);
        return validateConfig(raw, filePath);
    }
    catch (error) {
        const err = error;
        return {
            config: {},
            warnings: [],
            errors: [`${filePath}: Failed to parse JSON: ${err.message}`],
        };
    }
}
/**
 * Merge multiple configuration objects with proper precedence.
 * Later configs override earlier ones, with special handling for arrays.
 */
function mergeConfigs(...configs) {
    const result = {};
    for (const config of configs) {
        for (const [key, value] of Object.entries(config)) {
            if (value !== undefined) {
                // Type assertion is safe here since we're merging known ConfigFile objects
                ;
                result[key] = value;
            }
        }
    }
    return result;
}
/**
 * Determine the cache path based on git repository or current directory.
 */
async function determineCachePath(cwd) {
    // Try to find .git directory by walking up
    let currentDir = cwd;
    while (true) {
        const gitDir = join(currentDir, '.git');
        if (await exists(gitDir)) {
            return join(gitDir, '.todoexpand-cache.json');
        }
        const parentDir = dirname(currentDir);
        if (parentDir === currentDir) {
            break;
        }
        currentDir = parentDir;
    }
    // Fallback to current directory
    return join(cwd, '.todoexpand-cache.json');
}
/**
 * Load and resolve configuration from config files, CLI flags, env vars, and defaults.
 *
 * Configuration precedence (highest to lowest):
 * 1. CLI flags
 * 2. Environment variables
 * 3. Project config file (.todoexpandrc.json - nearest parent directory)
 * 4. Global config file (~/.config/todo-expand/config.json)
 * 5. Built-in defaults
 *
 * @param options.cwd - Current working directory for project config resolution
 * @param options.cli - Partial options from CLI flags (raw strings allowed)
 * @param options.configPath - Override config file path (optional)
 * @returns Fully-resolved configuration object and any warnings/errors
 */
export async function loadConfig({ cwd, cli, configPath, }) {
    const allWarnings = [];
    const allErrors = [];
    const sources = {};
    // Step 1: Load default configuration
    const defaults = {
        include: ['ts', 'tsx', 'js', 'jsx'],
        exclude: ['node_modules', 'build', 'dist', '.git'],
        style: 'succinct',
        sections: ['Context', 'Goal', 'Steps', 'Constraints', 'Acceptance'],
        model: 'gpt-4o-mini', // Will be overridden by env/config
        endpoint: 'https://api.openai.com/v1/responses',
        timeout: 45000,
        concurrency: 1,
        contextLines: 12,
        cache: true,
        format: true,
        strict: false,
        print: false,
        maxFileKB: 512,
        verboseLogs: false,
        retries: 2,
        retryBackoffMs: 500,
        perFileTimeoutMs: 120000,
        cachePath: undefined, // Will be set later
    };
    // Step 2: Load global configuration
    let globalConfig = {};
    if (!configPath) {
        try {
            const globalConfigDir = getGlobalConfigDir();
            const globalConfigPath = join(globalConfigDir, 'config.json');
            const globalResult = await loadConfigFile(globalConfigPath);
            if (globalResult) {
                globalConfig = globalResult.config;
                allWarnings.push(...globalResult.warnings);
                allErrors.push(...globalResult.errors);
                if (Object.keys(globalConfig).length > 0) {
                    sources.global = globalConfigPath;
                }
            }
        }
        catch (error) {
            const err = error;
            allWarnings.push(`Failed to load global config: ${err.message}`);
        }
    }
    // Step 3: Load project configuration
    let projectConfig = {};
    if (!configPath) {
        try {
            const projectConfigPath = await findProjectConfig(cwd);
            if (projectConfigPath) {
                const projectResult = await loadConfigFile(projectConfigPath);
                if (projectResult) {
                    projectConfig = projectResult.config;
                    allWarnings.push(...projectResult.warnings);
                    allErrors.push(...projectResult.errors);
                    if (Object.keys(projectConfig).length > 0) {
                        sources.project = projectConfigPath;
                    }
                }
            }
        }
        catch (error) {
            const err = error;
            allWarnings.push(`Failed to load project config: ${err.message}`);
        }
    }
    // Step 4: Load override configuration (if --config specified)
    let overrideConfig = {};
    if (configPath) {
        try {
            const overrideResult = await loadConfigFile(configPath);
            if (overrideResult) {
                overrideConfig = overrideResult.config;
                allWarnings.push(...overrideResult.warnings);
                allErrors.push(...overrideResult.errors);
                sources.override = configPath;
            }
            else {
                allErrors.push(`Config file not found: ${configPath}`);
            }
        }
        catch (error) {
            const err = error;
            allErrors.push(`Failed to load config file ${configPath}: ${err.message}`);
        }
    }
    // Step 5: Build environment configuration
    const envConfig = {};
    // Only add environment variables that are actually set and non-empty
    const envModel = dntShim.Deno.env.get('OPENAI_MODEL');
    if (envModel && envModel.trim()) {
        envConfig.model = envModel;
    }
    const envStyle = dntShim.Deno.env.get('TODO_EXPAND_STYLE');
    if (envStyle && envStyle.trim() &&
        (envStyle === 'succinct' || envStyle === 'verbose')) {
        envConfig.style = envStyle;
    }
    const envSections = dntShim.Deno.env.get('TODO_EXPAND_SECTIONS');
    if (envSections && envSections.trim()) {
        envConfig.sections = envSections.split(',').map((s) => s.trim()).filter((s) => s.length > 0);
    }
    // Step 6: Merge all configurations (precedence: CLI > env > project > global > defaults)
    const fileConfig = mergeConfigs(globalConfig, projectConfig, overrideConfig);
    const mergedConfig = mergeConfigs(fileConfig, envConfig);
    // Step 7: Apply CLI overrides with proper parsing
    const cliConfig = {};
    if (cli.include) {
        cliConfig.include = cli.include.split(',').map((s) => s.trim());
    }
    if (cli.exclude) {
        cliConfig.exclude = cli.exclude.split(',').map((s) => s.trim());
    }
    if (cli.style) {
        cliConfig.style = cli.style;
    }
    if (cli.sections) {
        cliConfig.sections = Array.isArray(cli.sections)
            ? cli.sections
            : cli.sections.split(',').map((s) => s.trim());
    }
    if (cli.model !== undefined)
        cliConfig.model = cli.model;
    if (cli.endpoint !== undefined)
        cliConfig.endpoint = cli.endpoint;
    if (cli.timeout !== undefined)
        cliConfig.timeout = cli.timeout;
    if (cli.concurrency !== undefined)
        cliConfig.concurrency = cli.concurrency;
    if (cli.contextLines !== undefined)
        cliConfig.contextLines = cli.contextLines;
    if (cli.cache !== undefined)
        cliConfig.cache = cli.cache;
    if (cli.format !== undefined)
        cliConfig.format = cli.format;
    if (cli.strict !== undefined)
        cliConfig.strict = cli.strict;
    if (cli.print !== undefined)
        cliConfig.print = cli.print;
    if (cli.verboseLogs !== undefined) {
        cliConfig.verboseLogs = cli.verboseLogs;
    }
    if (cli.retries !== undefined) {
        cliConfig.retries = cli.retries;
    }
    if (cli.retryBackoffMs !== undefined) {
        cliConfig.retryBackoffMs =
            cli.retryBackoffMs;
    }
    if (cli.perFileTimeoutMs !== undefined) {
        cliConfig.perFileTimeoutMs =
            cli.perFileTimeoutMs;
    }
    // Step 8: Final merge and create resolved configuration
    const finalConfig = mergeConfigs(mergedConfig, cliConfig);
    // Handle special logic for verboseLogs (auto-enable with verbose style)
    const styleUsed = finalConfig.style || defaults.style;
    const verboseLogsResolved = finalConfig.verboseLogs !== undefined
        ? finalConfig.verboseLogs
        : (styleUsed === 'verbose' ? true : defaults.verboseLogs);
    // Step 9: Create final configuration with all fields resolved
    const resolved = {
        include: finalConfig.include || defaults.include,
        exclude: finalConfig.exclude || defaults.exclude,
        style: styleUsed,
        sections: finalConfig.sections || defaults.sections,
        model: finalConfig.model || defaults.model,
        endpoint: finalConfig.endpoint || defaults.endpoint,
        timeout: finalConfig.timeout ?? defaults.timeout,
        concurrency: finalConfig.concurrency ?? defaults.concurrency,
        contextLines: finalConfig.contextLines ?? defaults.contextLines,
        cache: finalConfig.cache ?? defaults.cache,
        format: finalConfig.format ?? defaults.format,
        strict: finalConfig.strict ?? defaults.strict,
        print: finalConfig.print ?? defaults.print,
        maxFileKB: finalConfig.maxFileKB ?? defaults.maxFileKB,
        verboseLogs: verboseLogsResolved,
        retries: finalConfig.retries ?? defaults.retries,
        retryBackoffMs: finalConfig.retryBackoffMs ?? defaults.retryBackoffMs,
        perFileTimeoutMs: finalConfig.perFileTimeoutMs ?? defaults.perFileTimeoutMs,
        cachePath: await determineCachePath(cwd),
    };
    return {
        config: resolved,
        warnings: allWarnings,
        errors: allErrors,
        sources,
    };
}
/**
 * Print the resolved configuration with sources, optionally redacting secrets.
 * Used for --print-config functionality.
 */
export function printConfig(config, sources, redactSecrets = true) {
    const output = [];
    output.push('# Resolved Configuration');
    output.push('');
    // Show sources
    output.push('## Sources (in precedence order):');
    if (sources.override)
        output.push(`- Override: ${sources.override}`);
    output.push('- Environment variables');
    if (sources.project)
        output.push(`- Project: ${sources.project}`);
    if (sources.global)
        output.push(`- Global: ${sources.global}`);
    output.push('- Built-in defaults');
    output.push('');
    // Show final configuration
    output.push('## Final Configuration:');
    output.push('```json');
    const configCopy = { ...config };
    delete configCopy.cachePath; // Don't show internal field
    // Redact sensitive info if requested
    if (redactSecrets) {
        const apiKey = dntShim.Deno.env.get('OPENAI_API_KEY');
        if (apiKey && configCopy.model) {
            output.push('// Note: OPENAI_API_KEY is set (not shown for security)');
        }
    }
    output.push(JSON.stringify(configCopy, null, 2));
    output.push('```');
    return output.join('\n');
}
