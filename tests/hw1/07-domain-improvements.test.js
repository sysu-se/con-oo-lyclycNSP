import { describe, expect, it } from 'vitest'
import { loadDomainApi, makePuzzle } from './helpers/domain-api.js'

describe('HW1.1 domain improvements', () => {
  it('keeps puzzle givens locked', async () => {
    const { createSudoku } = await loadDomainApi()
    const sudoku = createSudoku(makePuzzle())

    expect(sudoku.guess({ row: 0, col: 0, value: 9 })).toBe(false)
    expect(sudoku.getGrid()[0][0]).toBe(5)
    expect(sudoku.isEditable(0, 0)).toBe(false)
    expect(sudoku.isEditable(0, 2)).toBe(true)
  })

  it('surfaces invalid cells from the domain layer', async () => {
    const { createGame, createSudoku } = await loadDomainApi()
    const sudoku = createSudoku(makePuzzle())

    sudoku.guess({ row: 0, col: 2, value: 5 })

    expect(sudoku.getInvalidCells()).toEqual(
      expect.arrayContaining(['0,0', '2,0']),
    )

    const game = createGame({ sudoku })
    const state = game.getState()

    expect(state.invalidCells).toEqual(
      expect.arrayContaining(['0,0', '2,0']),
    )
    expect(state.won).toBe(false)
  })
})
