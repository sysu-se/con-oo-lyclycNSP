import { describe, expect, it } from 'vitest'
import { loadDomainApi, makePuzzle } from './helpers/domain-api.js'

describe('HW1 extra round-trip coverage', () => {
  it('restores undo/redo history after game serialization', async () => {
    const { createGame, createGameFromJSON, createSudoku } = await loadDomainApi()

    const game = createGame({ sudoku: createSudoku(makePuzzle()) })
    game.guess({ row: 0, col: 2, value: 4 })
    game.guess({ row: 1, col: 1, value: 7 })
    game.undo()

    const restored = createGameFromJSON(
      JSON.parse(JSON.stringify(game.toJSON())),
    )

    expect(restored.canUndo()).toBe(true)
    expect(restored.canRedo()).toBe(true)

    restored.redo()
    expect(restored.getSudoku().getGrid()[1][1]).toBe(7)

    restored.undo()
    expect(restored.getSudoku().getGrid()[1][1]).toBe(0)
    expect(typeof restored.toString()).toBe('string')
  })
})
