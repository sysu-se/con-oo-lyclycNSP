import { describe, expect, it } from 'vitest'
import { loadDomainApi, makePuzzle } from './helpers/domain-api.js'

describe('HW1 game undo / redo', () => {
  it('supports a basic guess -> undo -> redo flow', async () => {
    const { createGame, createSudoku } = await loadDomainApi()
    const game = createGame({ sudoku: createSudoku(makePuzzle()) })

    game.guess({ row: 0, col: 2, value: 4 })
    expect(game.getSudoku().getGrid()[0][2]).toBe(4)
    expect(game.canUndo()).toBe(true)

    game.undo()
    expect(game.getSudoku().getGrid()[0][2]).toBe(0)
    expect(game.canRedo()).toBe(true)

    game.redo()
    expect(game.getSudoku().getGrid()[0][2]).toBe(4)
  })

  it('supports multiple undo steps in reverse order', async () => {
    const { createGame, createSudoku } = await loadDomainApi()
    const game = createGame({ sudoku: createSudoku(makePuzzle()) })

    game.guess({ row: 0, col: 2, value: 4 })
    game.guess({ row: 1, col: 1, value: 7 })

    expect(game.getSudoku().getGrid()[0][2]).toBe(4)
    expect(game.getSudoku().getGrid()[1][1]).toBe(7)

    game.undo()
    expect(game.getSudoku().getGrid()[1][1]).toBe(0)
    expect(game.getSudoku().getGrid()[0][2]).toBe(4)

    game.undo()
    expect(game.getSudoku().getGrid()[0][2]).toBe(0)
  })

  it('clears redo history after a new move following undo', async () => {
    const { createGame, createSudoku } = await loadDomainApi()
    const game = createGame({ sudoku: createSudoku(makePuzzle()) })

    game.guess({ row: 0, col: 2, value: 4 })
    game.guess({ row: 1, col: 1, value: 7 })

    game.undo()
    expect(game.canRedo()).toBe(true)

    game.guess({ row: 2, col: 0, value: 1 })
    expect(game.canRedo()).toBe(false)
    expect(game.getSudoku().getGrid()[2][0]).toBe(1)
  })
})
