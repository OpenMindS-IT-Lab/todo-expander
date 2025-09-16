#!/usr/bin/env node
// Wrapper that delegates to the main todo-expander CLI
import process from "node:process";
const { spawn } = require("child_process");
const path = require("path");

// Find the main todo-expander binary
const mainBinary = path.join(
  __dirname,
  "..",
  "node_modules",
  "todo-expander",
  "bin",
  "todo-expand",
);

// Spawn the main binary with all arguments
const child = spawn("node", [mainBinary, ...process.argv.slice(2)], {
  stdio: "inherit",
});

child.on("exit", (code) => {
  process.exit(code);
});
