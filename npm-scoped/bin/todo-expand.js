#!/usr/bin/env node
(async () => {
  try {
    await import('../esm/bin/todo-expand.js');
  } catch (err) {
    console.error('Failed to start todo-expand:', err.message);
    process.exit(1);
  }
})();
