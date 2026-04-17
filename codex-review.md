# con-oo-lyclycNSP - Review

## Review 结论

领域对象已经真实接入了 Svelte 主流程：棋盘渲染、用户输入、Undo/Redo 都会经过 store adapter 再落到 `Game`/`Sudoku`，不再是只在测试里存在的孤立实现。但当前接入仍然不够完整，尤其是游戏会话边界和规则语义存在割裂，导致新开局、提示等真实流程还有明显设计风险。

## 总体评价

| 维度 | 评价 |
| --- | --- |
| OOP | good |
| JS Convention | good |
| Sudoku Business | fair |
| OOD | fair |

## 缺点

### 1. 新开局没有重置完整会话状态

- 严重程度：core
- 位置：src/node_modules/@sudoku/game.js:13-33; src/node_modules/@sudoku/stores/candidates.js:1-32; src/node_modules/@sudoku/stores/notes.js:1-15
- 原因：`startNew` / `startCustom` 只重置了题盘、光标、计时器和 hints，但没有清空候选数，也没有把 notes 模式恢复到默认值。`candidates` 和 `notes` 都会直接影响棋盘显示和输入语义，所以它们实际上属于一局游戏的会话状态；现在它们游离在 `Game` 之外，会让上一局的笔记和模式泄漏到下一局，说明 Svelte 接入还没有形成完整的一局游戏边界。

### 2. `isValidMove` 与 `guess` 的规则语义分裂

- 严重程度：major
- 位置：src/domain/index.js:366-410
- 原因：`Sudoku` 一方面提供了 `isValidMove` 来判定移动是否合法，另一方面真正修改状态的 `guess` 却完全不使用这套判定，只检查是否可编辑和是否与原值相同。这会让对象的“规则”变成旁路信息，而不是对象自身维护的不变量；如果设计意图是允许错误填数并仅高亮冲突，那么当前 API 命名也会误导调用方。

### 3. 提示功能依赖外部求解器，缺少领域级前置约束

- 严重程度：major
- 位置：src/node_modules/@sudoku/stores/grid.js:172-191; src/node_modules/@sudoku/sudoku.js:26-49; src/domain/index.js:402-410
- 原因：`applyHint` 会先对“当前盘面”求解，再把结果经由 `Game.guess` 写回。但当前领域允许玩家留下冲突值，所以当前盘面并不一定可解；adapter 没有先校验盘面，也没有处理求解失败或异常路径。这样提示流程的正确性更多依赖第三方 solver 的容错，而不是由领域模型或接入层明确保证。

### 4. 领域状态直接暴露了 UI 专用的数据格式

- 严重程度：minor
- 位置：src/domain/index.js:119-157; src/domain/index.js:384-390; src/components/Board/index.svelte:45-51
- 原因：`invalidCells` 在领域层被建模成 `"x,y"` 字符串，以便组件直接 `includes`。这让 `Sudoku.getState()` 带上了明显的视图层编码约束，降低了领域对象的独立性；后续如果要复用到别的视图、做更严格的类型建模或更高效的比较，都必须先绕开这层字符串协议。

### 5. 根组件使用手写订阅而没有显式生命周期管理

- 严重程度：minor
- 位置：src/App.svelte:12-17
- 原因：`gameWon.subscribe(...)` 写在组件脚本顶层，没有看到对应的取消订阅，也没有采用更符合 Svelte 习惯的 `$store` 或 reactive statement。根组件通常生命周期较长，所以这不一定马上出错，但从 Svelte 架构惯例看，生命周期边界不够清晰。

## 优点

### 1. 采用了明确的 store adapter 来桥接领域对象和 Svelte

- 位置：src/node_modules/@sudoku/stores/grid.js:51-80
- 原因：adapter 内部持有真正的 `Game`，所有领域对象变更后统一通过 `state.set(currentGame.getState())` 投影到 Svelte。这个方案正面回答了“普通对象 mutate 为什么不会自动刷新 UI”的核心问题。

### 2. 真实输入与 Undo/Redo 已经过领域入口

- 位置：src/node_modules/@sudoku/stores/grid.js:150-220; src/components/Controls/Keyboard.svelte:10-25; src/components/Controls/ActionBar/Actions.svelte:24-29
- 原因：键盘输入通过 `userGrid.set -> Game.guess`，撤销/重做通过 `game.undo/redo -> grid.undo/redo -> Game.undo/redo`。组件层已经不再直接操作棋盘二维数组，这一点符合本次作业“真实接入”的要求。

### 3. 棋盘渲染消费的是领域导出的响应式视图状态

- 位置：src/components/Board/index.svelte:40-52
- 原因：`Board` 同时基于 `grid`、`userGrid`、`invalidCells` 等 store 渲染 givens、当前局面和冲突提示，说明 UI 看到的主要游戏状态已经来自领域对象的外表化结果，而不是旧逻辑中的裸数组。

### 4. Sudoku 的封装边界比较清楚

- 位置：src/domain/index.js:279-433
- 原因：`puzzleGrid` 和 `grid` 被闭包隐藏，对外读取、`getState()`、`toJSON()` 都返回深拷贝，避免了 UI 或测试代码意外共享内部数组引用。这种防御性复制对于 JS 环境下的领域对象是很有价值的。

### 5. Game 的历史建模集中而且可推理

- 位置：src/domain/index.js:510-648
- 原因：新输入前先拍快照，只有成功修改才进入 undo 栈，并在新输入时清空 redo；Undo/Redo 通过恢复快照替换整个 `Sudoku`。这让历史语义集中在 `Game` 内部，而不是散落在组件事件处理里。

### 6. 开始一局游戏的流程已经接到领域适配层

- 位置：src/App.svelte:19-31; src/components/Modal/Types/Welcome.svelte:16-23; src/node_modules/@sudoku/game.js:13-34
- 原因：欢迎弹窗无论是按难度开局还是通过分享码加载，最终都会进入 `startNew` / `startCustom`，并由 `grid.generate` / `grid.decodeSencode` 创建新的 `Game` 会话，而不是让组件自行拼题盘。

## 补充说明

- 本次结论仅基于静态阅读，未运行测试，也未实际操作界面；因此关于提示流程、新开局残留状态、胜利弹窗等结论都来自代码路径推导。
- 审查范围只覆盖了 `src/domain/*` 及其直接接入 Svelte 的代码路径，主要包括 `src/node_modules/@sudoku/game.js`、`src/node_modules/@sudoku/stores/*.js` 与使用这些 store/命令的相关 `.svelte` 组件。
- 涉及 `solveSudoku`、题目生成器等第三方依赖的运行时表现，本次没有做动态验证；相关判断只针对当前接入层缺失的约束与异常处理。
