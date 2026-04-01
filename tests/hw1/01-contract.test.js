import { describe, expect, it } from 'vitest'
import { expectGrid9x9, loadDomainApi, makePuzzle } from './helpers/domain-api.js'

describe('HW1 contract / exports', () => {
  it('exports the required factory functions', async () => {
    const api = await loadDomainApi()
    expect(typeof api.createSudoku).toBe('function')
    expect(typeof api.createSudokuFromJSON).toBe('function')
    expect(typeof api.createGame).toBe('function')
    expect(typeof api.createGameFromJSON).toBe('function')
  })

  it('createSudoku returns an object with the required methods', async () => {
    const { createSudoku } = await loadDomainApi()
    const sudoku = createSudoku(makePuzzle())

    expect(typeof sudoku.getGrid).toBe('function')
    expect(typeof sudoku.guess).toBe('function')
    expect(typeof sudoku.clone).toBe('function')
    expect(typeof sudoku.toJSON).toBe('function')
    expect(typeof sudoku.toString).toBe('function')

    expectGrid9x9(sudoku.getGrid())
  })

  it('createGame returns an object with the required methods', async () => {
    const { createGame, createSudoku } = await loadDomainApi()
    const game = createGame({ sudoku: createSudoku(makePuzzle()) })

    expect(typeof game.getSudoku).toBe('function')
    expect(typeof game.guess).toBe('function')
    expect(typeof game.undo).toBe('function')
    expect(typeof game.redo).toBe('function')
    expect(typeof game.canUndo).toBe('function')
    expect(typeof game.canRedo).toBe('function')
    expect(typeof game.toJSON).toBe('function')

    expectGrid9x9(game.getSudoku().getGrid())
  })
})
