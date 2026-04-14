# DESIGN

## 1. 领域对象职责边界

### `Sudoku`

`Sudoku` 负责表示“当前局面”本身，而不是整局历史：

- 持有 `puzzleGrid`（题面固定格）和 `grid`（当前盘面）
- 提供 `guess(...)` 修改当前局面
- 通过 `isEditable(...)` 保护题面固定格不被覆盖
- 提供 `getInvalidCells()` / `isValidMove()` / `isSolved()` 表达数独业务规则
- 提供 `toJSON()` / `toString()` / `clone()` 做外表化与复制

### `Game`

`Game` 负责表示“一局游戏会话”：

- 持有当前 `Sudoku`
- 管理 `undoStack` / `redoStack`
- 提供 `guess()` / `undo()` / `redo()`
- 提供 `getState()`，把当前可供 UI 消费的纯数据导出出来

这样拆分后，`Sudoku` 关注业务语义，`Game` 关注状态演进与历史。

## 2. 这次对 HW1 的实质改进

这次不是只保留 HW1 的最小可测版本，而是补上了两个关键缺口：

1. `Sudoku` 不再只是一个“9x9 数字矩阵包装器”。
   现在它显式建模了题面固定格，并且能判断哪些格子可编辑、哪些格子冲突、当前局面是否完成。

2. `Game` 不再让 UI 自己拼状态。
   现在通过 `getState()` 统一导出：
   - `puzzleGrid`
   - `grid`
   - `invalidCells`
   - `won`
   - `canUndo`
   - `canRedo`

这让 View 层真正消费领域对象，而不是继续自己重写规则。

## 3. `Move` 是值对象还是实体对象

`Move` 在这次设计里是值对象，而不是核心实体。

一次输入只由下面三个字段决定：

```js
{ row, col, value }
```

它没有独立身份，也不需要生命周期管理。两个内容完全相同的 `Move`，在业务上就是同一个输入动作。因此它适合作为轻量值对象传给 `Sudoku.guess(...)` 或 `Game.guess(...)`，而不适合作为需要长期持有的核心领域对象。

## 4. history 存储的是什么

`Game` 的历史里存的是 `Sudoku` 快照，而不是单独的 `Move`：

```js
{
  grid: number[][],
  puzzleGrid: number[][]
}
```

选择快照而不是 `Move` 的原因：

- Undo/Redo 更直接，恢复一个旧局面即可
- 历史不会依赖“旧值回推”
- 即使以后增加 hint、导入局面等操作，也不需要重写历史结构

代价是快照比 `Move` 占空间，但对于 9x9 数独，这个成本是可接受的。

## 5. 复制策略与深拷贝

只要二维数组跨对象边界流动，就做深拷贝：

- `createSudoku(input)` 时复制输入
- `getGrid()` / `getPuzzleGrid()` 返回副本
- `toJSON()` 返回副本
- `clone()` 通过序列化结果重建
- `Game` 历史栈保存的是快照副本

这么做是为了避免共享引用污染：

- 如果 `grid` 和 `history` 共享同一行数组，Undo/Redo 会失效
- 如果 View 拿到内部数组并直接改值，领域对象的 invariant 会被绕过

## 6. 序列化 / 反序列化设计

`Sudoku.toJSON()` 现在会序列化：

```js
{
  grid: number[][],
  puzzleGrid: number[][]
}
```

`Game.toJSON()` 会序列化：

```js
{
  sudoku: { grid, puzzleGrid },
  undoStack: [{ grid, puzzleGrid }, ...],
  redoStack: [{ grid, puzzleGrid }, ...]
}
```

其中：

- `grid` 表示当前盘面
- `puzzleGrid` 表示题面固定格

恢复时：

- `createSudokuFromJSON(...)` 会校验 `grid` / `puzzleGrid`
- 还会检查当前盘面是否保留了题面 givens
- `createGameFromJSON(...)` 会恢复当前局面和历史栈

## 7. View 层实际消费的是什么

View 层并不直接持有 `Game` 实例，而是消费一个 Svelte adapter：

- 位置：[src/node_modules/@sudoku/stores/grid.js](/home/lyclyc/workspace/con-oo-lyclycNSP/src/node_modules/@sudoku/stores/grid.js)
- 核心方式：闭包里持有 `currentGame`

这个 adapter 对外暴露两类东西：

### 响应式状态

- `grid`：题面固定格
- `userGrid`：当前盘面
- `invalidCells`
- `canUndo`
- `canRedo`
- `won`

### 命令

- `generate(...)`
- `decodeSencode(...)`
- `set(...)`
- `applyHint(...)`
- `undo()`
- `redo()`

组件只负责：

- 渲染这些状态
- 在点击/键盘事件中调用这些命令

关键逻辑不再散落在 `.svelte` 文件里。

## 8. Svelte 为什么会更新

这次接入依赖的是 Svelte 3 的 store 机制，而不是对象字段自动追踪。

`grid.js` 内部会维护：

1. 一个真正的领域对象 `currentGame`
2. 一个 Svelte `state` store，里面保存 `currentGame.getState()` 导出的纯数据

当用户输入、撤销、重做时：

1. 先调用 `currentGame.guess()` / `undo()` / `redo()`
2. 再调用 `state.set(currentGame.getState())`
3. Svelte 看到 store 被 `set(...)`，于是刷新 `$grid`、`$userGrid`、`$gameCanUndo` 等订阅值

所以 UI 更新的根本原因不是“对象内部字段变了”，而是“store 被重新 set 了新的纯数据状态”。

## 9. 为什么不能直接 mutate 领域对象给 UI 用

如果只写：

```js
currentGame.guess(...)
```

但不调用 `state.set(...)`，那么 Svelte 组件并不会知道 `currentGame` 内部字段已经变化，因为：

- Svelte 3 不会自动追踪普通对象内部属性
- `$store` 只会对 store 的 `set/update` 产生响应

同理，直接改二维数组元素也有风险：

- 可能绕过 `Sudoku` 的固定格保护
- 可能绕过领域层的 invariant
- 可能让 reactive statement 或 derived store 得到不一致状态

所以这次方案要求：

- 领域对象负责业务规则
- adapter 负责把领域状态转成 store
- 组件只消费 store，不直接 mutate 领域对象内部数组

## 10. 新设计的 trade-off

这次设计的主要 trade-off 有三点：

1. history 选择快照而不是 `Move`
   优点是 Undo/Redo 和序列化恢复都更直接；代价是内存占用比只存 `Move` 更高。

2. UI 不直接消费领域对象，而是多了一层 Svelte adapter
   优点是领域层可以保持框架无关，Svelte 响应式边界也更清楚；代价是需要维护一层状态投影代码。

3. `Sudoku` 负责固定格与冲突校验
   优点是业务规则更内聚；代价是对象职责比 HW1 更重，但仍然处在“局面对象”合理边界内，没有把历史逻辑也塞进去。

## 11. 关键文件

- [src/domain/index.js](/home/lyclyc/workspace/con-oo-lyclycNSP/src/domain/index.js)
  领域对象实现，包含 `Sudoku` / `Game`

- [src/node_modules/@sudoku/stores/grid.js](/home/lyclyc/workspace/con-oo-lyclycNSP/src/node_modules/@sudoku/stores/grid.js)
  Svelte adapter，负责把领域对象接入真实 UI 流程

- [src/node_modules/@sudoku/stores/game.js](/home/lyclyc/workspace/con-oo-lyclycNSP/src/node_modules/@sudoku/stores/game.js)
  暴露 `gamePaused`、`gameCanUndo`、`gameCanRedo`、`gameWon`

- [src/components/Board/index.svelte](/home/lyclyc/workspace/con-oo-lyclycNSP/src/components/Board/index.svelte)
  消费 `grid` / `userGrid` / `invalidCells`

- [src/components/Controls/Keyboard.svelte](/home/lyclyc/workspace/con-oo-lyclycNSP/src/components/Controls/Keyboard.svelte)
  通过 `userGrid.set(...)` 将输入转给领域对象

- [src/components/Controls/ActionBar/Actions.svelte](/home/lyclyc/workspace/con-oo-lyclycNSP/src/components/Controls/ActionBar/Actions.svelte)
  通过 `game.undo()` / `game.redo()` 调用领域层历史逻辑
