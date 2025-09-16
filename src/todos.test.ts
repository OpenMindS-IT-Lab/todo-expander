import { assert, assertEquals } from '@std/assert'
import { detectTodos } from './todos.ts'

Deno.test('detectTodos: finds single-line TODOs', () => {
  const content = [
    'const a = 1 // TODO: tighten types',
    '# TODO add logging',
    'no todo here',
  ].join('\n')

  const { todos } = detectTodos(content)
  assertEquals(todos.length, 2)
  assertEquals(todos[0].style, 'line')
  assert(['//', '#'].includes(todos[0].marker))
})

Deno.test('detectTodos: finds block TODOs', () => {
  const content = [
    '/* TODO: improve performance',
    'details here',
    '*/',
    'code();',
  ].join('\n')

  const { todos } = detectTodos(content)
  assertEquals(todos.length, 1)
  assertEquals(todos[0].style, 'block')
  assertEquals(todos[0].marker, '/*')
  assertEquals(todos[0].start, 0)
  assertEquals(todos[0].end, 2)
})

Deno.test('detectTodos: filters already-structured TODOs', () => {
  const content = [
    '/* TODO: refactor this module',
    'Context: current implementation is slow',
    'Goal: reduce complexity',
    'Steps: ...',
    'Constraints: ...',
    'Acceptance: ...',
    '*/',
  ].join('\n')

  const { todos } = detectTodos(content)
  assertEquals(todos.length, 0)
})
