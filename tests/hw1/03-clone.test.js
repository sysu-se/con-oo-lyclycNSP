import { describe, expect, it } from 'vitest'
import { loadDomainApi, makeMove, makePuzzle } from './helpers/domain-api.js'

describe('HW1 clone / deep copy', () => {
  it('clone() creates an independent sudoku copy', async () => {
    const { createSudoku } = await loadDomainApi()
    const original = createSudoku(makePuzzle())
    const cloned = original.clone()

    cloned.guess(makeMove({ row: 0, col: 2, value: 4 }))

    expect(original.getGrid()[0][2]).toBe(0)
    expect(cloned.getGrid()[0][2]).toBe(4)
  })

  it('multiple clones do not pollute each other through shared nested arrays', async () => {
    const { createSudoku } = await loadDomainApi()
    const original = createSudoku(makePuzzle())
    const cloneA = original.clone()
    const cloneB = original.clone()

    cloneA.guess(makeMove({ row: 1, col: 1, value: 7 }))
    cloneB.guess(makeMove({ row: 1, col: 2, value: 2 }))

    expect(original.getGrid()[1][1]).toBe(0)
    expect(original.getGrid()[1][2]).toBe(0)
    expect(cloneA.getGrid()[1][1]).toBe(7)
    expect(cloneA.getGrid()[1][2]).toBe(0)
    expect(cloneB.getGrid()[1][1]).toBe(0)
    expect(cloneB.getGrid()[1][2]).toBe(2)
  })
})
