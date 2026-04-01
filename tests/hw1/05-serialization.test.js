import { describe, expect, it } from 'vitest'
import { loadDomainApi, makePuzzle } from './helpers/domain-api.js'

describe('HW1 serialization / deserialization', () => {
  it('supports sudoku round-trip serialization', async () => {
    const { createSudoku, createSudokuFromJSON } = await loadDomainApi()

    const sudoku = createSudoku(makePuzzle())
    sudoku.guess({ row: 0, col: 2, value: 4 })

    const restored = createSudokuFromJSON(
      JSON.parse(JSON.stringify(sudoku.toJSON())),
    )

    expect(restored.getGrid()).toEqual(sudoku.getGrid())
    expect(typeof restored.toString()).toBe('string')
  })

  it('supports game round-trip serialization for the current board state', async () => {
    const { createGame, createGameFromJSON, createSudoku } = await loadDomainApi()

    const game = createGame({ sudoku: createSudoku(makePuzzle()) })
    game.guess({ row: 0, col: 2, value: 4 })
    game.guess({ row: 1, col: 1, value: 7 })

    const restored = createGameFromJSON(
      JSON.parse(JSON.stringify(game.toJSON())),
    )

    expect(restored.getSudoku().getGrid()).toEqual(game.getSudoku().getGrid())
  })
})
