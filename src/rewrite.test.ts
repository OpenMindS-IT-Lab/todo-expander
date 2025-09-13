import {
  assertEquals,
  assertStringIncludes,
} from 'https://deno.land/std@0.223.0/assert/mod.ts'
import { applyRewrites } from './rewrite.ts'

Deno.test('applyRewrites: normalizes to line comments with original marker', () => {
  const content = ['before', '// TODO: replace this comment', 'after'].join(
    '\n',
  )
  const todo = {
    start: 1,
    end: 1,
    raw: '// TODO: replace this comment',
    style: 'line' as const,
    marker: '//',
  }
  const newComment = ['Context: X', 'Goal: Y'].join('\n')
  const out = applyRewrites({ content, todo, newComment })

  // Should prefix each line with //
  assertStringIncludes(out, '// Context: X')
  assertStringIncludes(out, '// Goal: Y')
  // One-line TODO should be replaced by two lines
  const lines = out.split('\n')
  assertEquals(lines.length, 4)
})

Deno.test('applyRewrites: normalizes to block comments', () => {
  const content = ['/* TODO: rewrite as block */', 'code()'].join('\n')
  const todo = {
    start: 0,
    end: 0,
    raw: '/* TODO: rewrite as block */',
    style: 'block' as const,
    marker: '/*',
  }
  const newComment = ['Context: Fast', 'Goal: Safer'].join('\n')
  const out = applyRewrites({ content, todo, newComment })

  // Should wrap with /* ... */ and preserve inner text
  assertStringIncludes(out, '/*')
  assertStringIncludes(out, 'Context: Fast')
  assertStringIncludes(out, 'Goal: Safer')
  assertStringIncludes(out, '*/')
})
