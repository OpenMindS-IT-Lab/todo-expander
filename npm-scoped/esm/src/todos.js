/** TODO detection utilities. */
/** Matches single-line TODO comments of the form `// TODO:` or `# TODO:`. */
const TODO_SINGLE = /(^|\s)(\/\/|#)\s*TODO[:\s](.*)$/i;
/** Matches the start of a block TODO comment (e.g., the beginning of a /* TODO: ... block). */
const TODO_BLOCK_START = /\/\*\s*TODO[:\s]/i;
/**
 * Detect raw TODO comments (single-line and block) within file content.
 * Skips TODOs that already look structured (Context/Goal/Steps/etc.).
 */
/**
 * Detect raw TODO comments (single-line and block) within file content.
 * Skips TODOs that already look structured (contain Context/Goal/Steps/etc.).
 *
 * @param content - Entire file contents as a string.
 * @returns Object containing an array of unstructured TODO matches.
 * @example
 * const { todos } = detectTodos("// TODO: refactor\nconst x=1\n")
 * console.log(todos.length) // 1
 */
export function detectTodos(content) {
    const lines = content.split('\n');
    const todos = [];
    // single-line TODOs
    lines.forEach((ln, i) => {
        const m = ln.match(TODO_SINGLE);
        if (m) {
            const marker = m[2] === '#' ? '#' : '//';
            todos.push({ start: i, end: i, raw: ln, style: 'line', marker });
        }
    });
    // block TODOs
    for (let i = 0; i < lines.length; i++) {
        if (TODO_BLOCK_START.test(lines[i])) {
            const start = i;
            while (i < lines.length && !/\*\//.test(lines[i]))
                i++;
            const end = Math.min(i, lines.length - 1);
            const raw = lines.slice(start, end + 1).join('\n');
            todos.push({ start, end, raw, style: 'block', marker: '/*' });
        }
    }
    // filter out already structured briefs
    const isStructured = (text) => /AI TASK:|\bContext\b|\bGoal\b|\bSteps\b|\bConstraints\b|\bAcceptance\b/
        .test(text);
    const filtered = todos.filter((t) => !isStructured(t.raw));
    return { todos: filtered };
}
