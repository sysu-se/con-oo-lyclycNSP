# DESIGN

## 1. `Sudoku` / `Game` 的职责边界是什么？

`Sudoku` 只负责“局面”本身：

- 持有当前 9x9 `grid`
- 提供 `getGrid()` 读取局面
- 提供 `guess(move)` 修改一个格子
- 提供 `clone()` 生成独立副本
- 提供 `toJSON()` / `toString()` 做序列化和调试外表化

`Game` 负责“这一局游戏会话”：

- 持有当前 `Sudoku`
- 管理 `undoStack` / `redoStack`
- 提供 `guess()` / `undo()` / `redo()`
- 提供 `canUndo()` / `canRedo()`
- 提供 `toJSON()` / `createGameFromJSON()` 保存和恢复整局状态

这样分层后，`Sudoku` 不需要知道历史记录，`Game` 也不直接操作原始二维数组，而是通过 `Sudoku` 完成当前局面的替换和恢复。

## 2. `Move` 是值对象还是实体对象？为什么？

`Move` 是值对象。

这里的 `Move` 只是：

```js
{ row, col, value }
```

它没有自己的生命周期，也不需要身份标识。两个字段内容完全相同的 `Move`，在业务上就是同一个动作。所以它更适合作为轻量值对象，而不是核心实体对象。

## 3. history 中存储的是什么？为什么？

我在 `Game` 里存的是 `Sudoku` 快照，而不是单独的 `Move`。

具体来说，`undoStack` / `redoStack` 里存的是：

```js
{
  grid: number[][]
}
```

选择快照有两个原因：

1. Undo/Redo 实现更直接。撤销时直接恢复到上一个局面，不需要反推“旧值是什么”。
2. 对当前作业更稳健。后面如果增加“提示”“批量填入”“导入局面”等操作，快照方案不需要重新设计历史结构。

代价是占用的内存会比只存 `Move` 更大，但本作业每个局面只有 81 个数字，这个代价可以接受。

## 4. 复制策略是什么？哪些地方需要深拷贝？

复制策略是：只要数据可能跨对象边界流动，就复制二维数组。

具体包括：

- `createSudoku(input)` 时复制输入 `grid`
- `getGrid()` 返回副本，避免调用方改坏内部状态
- `clone()` 创建全新的 `Sudoku`
- `toJSON()` 返回可序列化的副本
- `Game` 存入历史栈时存快照，而不是存同一个数组引用

必须深拷贝的原因是 `grid` 是二维数组。  
如果只做浅拷贝，例如只复制最外层数组，那么多份 `Sudoku` 可能共享同一行数组。这样修改 clone 或 history 里的一个局面，会污染原对象，Undo/Redo 也会失效。

## 5. 序列化 / 反序列化设计是什么？

`Sudoku.toJSON()` 序列化：

```js
{
  grid: number[][]
}
```

`Game.toJSON()` 序列化：

```js
{
  sudoku: { grid: ... },
  undoStack: [{ grid: ... }, ...],
  redoStack: [{ grid: ... }, ...]
}
```

会被序列化的字段：

- 当前局面的 `grid`
- `undoStack`
- `redoStack`

不会被序列化的字段：

- 方法本身
- 临时局部变量

恢复时：

- `createSudokuFromJSON(json)` 用 `json.grid` 重建 `Sudoku`
- `createGameFromJSON(json)` 先恢复当前 `Sudoku`，再恢复历史栈中的快照

这样可以保证 round-trip：`serialize -> deserialize` 后对象仍然具备完整方法，而不是只得到普通对象。

## 6. 外表化接口是什么？为什么这样设计？

我提供了两种外表化：

1. `toJSON()`
2. `toString()`

`Sudoku.toString()` 会把 0 显示成 `.`，输出为便于阅读的 9 行文本，例如：

```txt
5 3 . . 7 . . . .
6 . . 1 9 5 . . .
. 9 8 . . . . 6 .
...
```

这样在调试时能直接看出当前局面，而不是得到 `[object Object]`。

`Game.toString()` 则额外输出：

- 当前 `undo` 数量
- 当前 `redo` 数量
- 当前 `Sudoku` 的文本表示

这样调试 Undo/Redo 时更直观。

## 7. UI 层是如何接入领域对象的？

为了满足“关键逻辑不散落在组件代码中”，我没有让 Svelte 组件直接操作二维数组，而是让现有 store 调用领域对象：

- `src/node_modules/@sudoku/stores/grid.js`
  - 持有当前 `Game`
  - 输入数字时调用 `game.guess(...)`
  - Undo/Redo 按钮调用 `game.undo()` / `game.redo()`
  - 再把结果同步回 Svelte store 用于渲染

这样 UI 只负责事件转发和显示，领域逻辑仍然集中在 `src/domain/index.js`。

## 8. 加分项完成情况

本次实现实际覆盖了 3 个加分方向：

### 8.1 更清晰的调试表示

`Sudoku.toString()` 会把当前局面格式化为 9 行文本，并把空格显示为 `.`。  
`Game.toString()` 会在此基础上额外输出 `undo` / `redo` 的长度，便于调试历史状态。

### 8.2 更完整的 round-trip 测试

除了课程给定测试外，我还补充了一个额外测试：

- `tests/hw1/06-extra-roundtrip.test.js`

这个测试验证的不只是“当前棋盘能恢复”，还验证了：

- `Game` 序列化后恢复时，`undoStack` / `redoStack` 也能恢复
- 恢复后的对象仍然可以继续 `undo()` / `redo()`
- `toString()` 在恢复后仍然可用

### 8.3 更优雅的 history 结构

history 使用的是“快照双栈”结构：

- `undoStack`
- `redoStack`

每次 `guess()`：

1. 把当前局面快照压入 `undoStack`
2. 清空 `redoStack`
3. 修改当前 `Sudoku`

每次 `undo()` / `redo()` 都是在两条栈之间移动当前局面的快照。  
这个结构的优点是规则简单、行为稳定，而且非常适合当前作业规模。