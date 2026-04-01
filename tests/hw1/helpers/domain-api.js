import { expect } from 'vitest'

export async function loadDomainApi() {
  const mod = await import('../../../src/domain/index.js')

  expect(typeof mod.createSudoku).toBe('function')
  expect(typeof mod.createSudokuFromJSON).toBe('function')
  expect(typeof mod.createGame).toBe('function')
  expect(typeof mod.createGameFromJSON).toBe('function')

  return mod
}

export function makePuzzle() {
  return [
    [5, 3, 0, 0, 7, 0, 0, 0, 0],
    [6, 0, 0, 1, 9, 5, 0, 0, 0],
    [0, 9, 8, 0, 0, 0, 0, 6, 0],
    [8, 0, 0, 0, 6, 0, 0, 0, 3],
    [4, 0, 0, 8, 0, 3, 0, 0, 1],
    [7, 0, 0, 0, 2, 0, 0, 0, 6],
    [0, 6, 0, 0, 0, 0, 2, 8, 0],
    [0, 0, 0, 4, 1, 9, 0, 0, 5],
    [0, 0, 0, 0, 8, 0, 0, 7, 9],
  ]
}

export function makeMove({ row = 0, col = 2, value = 4 } = {}) {
  return { row, col, value }
}

export function expectGrid9x9(grid) {
  expect(Array.isArray(grid)).toBe(true)
  expect(grid).toHaveLength(9)
  for (const row of grid) {
    expect(Array.isArray(row)).toBe(true)
    expect(row).toHaveLength(9)
    for (const cell of row) {
      expect(typeof cell).toBe('number')
    }
  }
}

export function normalizeGrid(grid) {
  return structuredClone(grid)
}
