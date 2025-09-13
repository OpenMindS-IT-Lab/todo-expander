// Playground file to quickly test todo-expander tool behavior

// Simple TODO that should be expanded
// TODO: Implement input validation for user-provided config
export function validateConfig(input: unknown) {
  return Boolean(input)
}

// TODO case-insensitive detection should work too
// todo: add better type narrowing here
export function narrowType(x: unknown): x is Record<string, unknown> {
  return typeof x === 'object' && x !== null
}

/* TODO: Multi-line block todo should be expanded too
- cover edge cases
- think about performance
*/
export function compute(a: number, b: number) {
  // trivial logic for now
  return a + b
}

// Already structured block (should be skipped by the tool)
// AI TASK
// Context: This section indicates an already-expanded TODO
// Goal: Ensure the tool does not re-expand structured items
// Steps: 1) Detect keywords, 2) Skip rewriting
// Acceptance: No changes to this block
export const structuredSkip = true

// TODO: Another one near the end for ordering checks
export function tail() {
  return 'ok'
}
