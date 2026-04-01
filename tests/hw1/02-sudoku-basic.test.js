import { describe, expect, it } from 'vitest'
import { expectGrid9x9, loadDomainApi, makeMove, makePuzzle } from './helpers/domain-api.js'

describe('HW1 sudoku basic behavior', () => {
  it('defensively copies the input grid on creation', async () => {
    const { createSudoku } = await loadDomainApi()
    const input = makePuzzle()
    const sudoku = createSudoku(input)

    input[0][0] = 9

    const grid = sudoku.getGrid()
    expectGrid9x9(grid)
    expect(grid[0][0]).toBe(5)
  })

  it('guess(move) updates the target cell', async () => {
    const { createSudoku } = await loadDomainApi()
    const sudoku = createSudoku(makePuzzle())

    sudoku.guess(makeMove({ row: 0, col: 2, value: 4 }))

    const grid = sudoku.getGrid()
    expect(grid[0][2]).toBe(4)
  })

  it('getGrid returns a 9x9 numeric grid', async () => {
    const { createSudoku } = await loadDomainApi()
    const sudoku = createSudoku(makePuzzle())
    expectGrid9x9(sudoku.getGrid())
  })

  it('toString() returns a readable string instead of [object Object]', async () => {
    const { createSudoku } = await loadDomainApi()
    const sudoku = createSudoku(makePuzzle())
    const text = sudoku.toString()

    expect(typeof text).toBe('string')
    expect(text.length).toBeGreaterThan(20)
    expect(text).not.toBe('[object Object]')
  })

  it('toJSON() returns serializable plain data', async () => {
    const { createSudoku } = await loadDomainApi()
    const sudoku = createSudoku(makePuzzle())
    const json = sudoku.toJSON()

    expect(() => JSON.stringify(json)).not.toThrow()

    const roundTrip = JSON.parse(JSON.stringify(json))
    expect(roundTrip).toBeDefined()
  })
})
