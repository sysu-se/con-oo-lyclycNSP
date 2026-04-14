/**
 * 深拷贝 9x9 棋盘，避免调用方和领域对象共享二维数组引用。
 *
 * @param {number[][]} grid
 * @returns {number[][]}
 */
function cloneGrid(grid) {
	return grid.map(row => row.slice());
}

/**
 * 校验单个坐标是否落在数独棋盘范围内。
 *
 * @param {number} value
 * @param {string} name
 */
function assertCoordinate(value, name) {
	if (!Number.isInteger(value) || value < 0 || value > 8) {
		throw new Error(`${name} must be an integer between 0 and 8.`);
	}
}

/**
 * 校验输入是否为合法的 9x9 数独棋盘。
 *
 * @param {number[][]} grid
 * @param {string} [label]
 */
function assertGrid(grid, label = 'Sudoku grid') {
	if (!Array.isArray(grid) || grid.length !== 9) {
		throw new Error(`${label} must be a 9x9 array.`);
	}

	for (const row of grid) {
		if (!Array.isArray(row) || row.length !== 9) {
			throw new Error(`${label} must be a 9x9 array.`);
		}

		for (const cell of row) {
			if (!Number.isInteger(cell) || cell < 0 || cell > 9) {
				throw new Error(`${label} cells must be integers between 0 and 9.`);
			}
		}
	}
}

/**
 * 规范化用户输入的移动对象。
 *
 * @param {{ row: number, col: number, value: number }} move
 * @returns {{ row: number, col: number, value: number }}
 */
function normalizeMove(move) {
	if (!move || typeof move !== 'object') {
		throw new Error('Move must be an object.');
	}

	const { row, col, value } = move;
	assertCoordinate(row, 'Move row');
	assertCoordinate(col, 'Move col');

	if (!Number.isInteger(value) || value < 0 || value > 9) {
		throw new Error('Move value must be an integer between 0 and 9.');
	}

	return { row, col, value };
}

/**
 * 校验当前盘面是否仍然保留题面固定格。
 *
 * @param {number[][]} puzzleGrid
 * @param {number[][]} grid
 */
function assertPuzzleCompatibility(puzzleGrid, grid) {
	for (let row = 0; row < 9; row++) {
		for (let col = 0; col < 9; col++) {
			const fixedValue = puzzleGrid[row][col];
			if (fixedValue !== 0 && grid[row][col] !== fixedValue) {
				throw new Error('Sudoku grid must preserve puzzle givens.');
			}
		}
	}
}

/**
 * 收集一个行/列/宫内的重复数字坐标。
 *
 * @param {number[][]} grid
 * @param {{ row: number, col: number }[]} cells
 * @param {Set<string>} invalid
 */
function scanUnit(grid, cells, invalid) {
	const grouped = new Map();

	for (const cell of cells) {
		const value = grid[cell.row][cell.col];
		if (value === 0) {
			continue;
		}

		if (!grouped.has(value)) {
			grouped.set(value, []);
		}
		grouped.get(value).push(cell);
	}

	for (const duplicates of grouped.values()) {
		if (duplicates.length < 2) {
			continue;
		}

		for (const cell of duplicates) {
			invalid.add(`${cell.col},${cell.row}`);
		}
	}
}

/**
 * 返回当前棋盘中所有冲突格的坐标列表，格式为 `x,y`。
 *
 * @param {number[][]} grid
 * @returns {string[]}
 */
function collectInvalidCells(grid) {
	const invalid = new Set();

	for (let row = 0; row < 9; row++) {
		scanUnit(
			grid,
			Array.from({ length: 9 }, (_, col) => ({ row, col })),
			invalid,
		);
	}

	for (let col = 0; col < 9; col++) {
		scanUnit(
			grid,
			Array.from({ length: 9 }, (_, row) => ({ row, col })),
			invalid,
		);
	}

	for (let boxRow = 0; boxRow < 3; boxRow++) {
		for (let boxCol = 0; boxCol < 3; boxCol++) {
			const cells = [];
			for (let row = boxRow * 3; row < boxRow * 3 + 3; row++) {
				for (let col = boxCol * 3; col < boxCol * 3 + 3; col++) {
					cells.push({ row, col });
				}
			}

			scanUnit(grid, cells, invalid);
		}
	}

	return Array.from(invalid);
}

/**
 * 判断把某个值放入指定位置后，是否会与同行、同列或同宫冲突。
 *
 * @param {number[][]} grid
 * @param {number} row
 * @param {number} col
 * @param {number} value
 * @returns {boolean}
 */
function wouldConflict(grid, row, col, value) {
	if (value === 0) {
		return false;
	}

	for (let index = 0; index < 9; index++) {
		if (index !== col && grid[row][index] === value) {
			return true;
		}

		if (index !== row && grid[index][col] === value) {
			return true;
		}
	}

	const startRow = Math.floor(row / 3) * 3;
	const startCol = Math.floor(col / 3) * 3;
	for (let nextRow = startRow; nextRow < startRow + 3; nextRow++) {
		for (let nextCol = startCol; nextCol < startCol + 3; nextCol++) {
			if ((nextRow !== row || nextCol !== col) && grid[nextRow][nextCol] === value) {
				return true;
			}
		}
	}

	return false;
}

/**
 * 判断棋盘是否已经填满。
 *
 * @param {number[][]} grid
 * @returns {boolean}
 */
function isComplete(grid) {
	return grid.every(row => row.every(cell => cell !== 0));
}

/**
 * 深拷贝历史快照，避免 undo/redo 栈共享内部引用。
 *
 * @param {{ grid: number[][], puzzleGrid: number[][] }} snapshot
 * @returns {{ grid: number[][], puzzleGrid: number[][] }}
 */
function cloneSnapshot(snapshot) {
	return {
		grid: cloneGrid(snapshot.grid),
		puzzleGrid: cloneGrid(snapshot.puzzleGrid),
	};
}

/**
 * 将当前 `Sudoku` 实例转成可存入历史栈的纯数据快照。
 *
 * @param {{ toJSON: () => { grid: number[][], puzzleGrid: number[][] } }} sudoku
 * @returns {{ grid: number[][], puzzleGrid: number[][] }}
 */
function snapshotSudoku(sudoku) {
	return cloneSnapshot(sudoku.toJSON());
}

/**
 * 从纯数据快照恢复出新的 `Sudoku` 实例。
 *
 * @param {{ grid: number[][], puzzleGrid: number[][] }} snapshot
 * @returns {ReturnType<typeof createSudoku>}
 */
function restoreSudoku(snapshot) {
	return createSudokuFromJSON(snapshot);
}

/**
 * 标准化序列化后的历史快照列表，兼容旧格式并重新执行领域校验。
 *
 * @param {Array<{ grid: number[][], puzzleGrid?: number[][] }>} snapshots
 * @param {number[][]} fallbackPuzzleGrid
 * @returns {Array<{ grid: number[][], puzzleGrid: number[][] }>}
 */
function normalizeSnapshotList(snapshots, fallbackPuzzleGrid) {
	if (!Array.isArray(snapshots)) {
		return [];
	}

	return snapshots.map(snapshot =>
		createSudokuFromJSON({
			grid: snapshot.grid,
			puzzleGrid: snapshot.puzzleGrid ?? fallbackPuzzleGrid,
		}).toJSON(),
	);
}

/**
 * 创建一个 `Sudoku` 领域对象。
 *
 * @param {number[][]} input
 * @returns {{
 *   getGrid: () => number[][],
 *   getPuzzleGrid: () => number[][],
 *   isEditable: (row: number, col: number) => boolean,
 *   canGuess: (move: { row: number, col: number, value: number }) => boolean,
 *   isValidMove: (move: { row: number, col: number, value: number }) => boolean,
 *   getInvalidCells: () => string[],
 *   isSolved: () => boolean,
 *   getState: () => { puzzleGrid: number[][], grid: number[][], invalidCells: string[], won: boolean },
 *   guess: (move: { row: number, col: number, value: number }) => boolean,
 *   clone: () => ReturnType<typeof createSudoku>,
 *   toJSON: () => { grid: number[][], puzzleGrid: number[][] },
 *   toString: () => string
 * }}
 */
export function createSudoku(input) {
	assertGrid(input);

	const puzzleGrid = cloneGrid(input);
	let grid = cloneGrid(input);

	/**
	 * 判断某个格子是否允许玩家输入。
	 *
	 * @param {number} row
	 * @param {number} col
	 * @returns {boolean}
	 */
	function isEditable(row, col) {
		assertCoordinate(row, 'Row');
		assertCoordinate(col, 'Col');
		return puzzleGrid[row][col] === 0;
	}

	/**
	 * 计算当前棋盘中的所有冲突格。
	 *
	 * @returns {string[]}
	 */
	function getInvalidCells() {
		return collectInvalidCells(grid);
	}

	/**
	 * 判断当前棋盘是否已经填满且没有冲突。
	 *
	 * @returns {boolean}
	 */
	function isSolved() {
		return isComplete(grid) && getInvalidCells().length === 0;
	}

	/**
	 * 将当前对象外表化为可序列化的纯数据。
	 *
	 * @returns {{ grid: number[][], puzzleGrid: number[][] }}
	 */
	function toJSON() {
		return {
			grid: cloneGrid(grid),
			puzzleGrid: cloneGrid(puzzleGrid),
		};
	}

	return {
		/**
		 * 返回当前盘面的深拷贝，供 UI 或测试安全读取。
		 *
		 * @returns {number[][]}
		 */
		getGrid() {
			return cloneGrid(grid);
		},

		/**
		 * 返回题面固定格的深拷贝。
		 *
		 * @returns {number[][]}
		 */
		getPuzzleGrid() {
			return cloneGrid(puzzleGrid);
		},

		isEditable,

		/**
		 * 判断一次输入是否落在可编辑格。
		 *
		 * @param {{ row: number, col: number, value: number }} move
		 * @returns {boolean}
		 */
		canGuess(move) {
			const { row, col } = normalizeMove(move);
			return isEditable(row, col);
		},

		/**
		 * 判断一次输入在业务规则上是否有效。
		 *
		 * @param {{ row: number, col: number, value: number }} move
		 * @returns {boolean}
		 */
		isValidMove(move) {
			const { row, col, value } = normalizeMove(move);
			if (!isEditable(row, col)) {
				return value === grid[row][col];
			}

			return !wouldConflict(grid, row, col, value);
		},

		getInvalidCells,

		isSolved,

		/**
		 * 导出供 UI 直接消费的纯数据状态。
		 *
		 * @returns {{ puzzleGrid: number[][], grid: number[][], invalidCells: string[], won: boolean }}
		 */
		getState() {
			return {
				puzzleGrid: cloneGrid(puzzleGrid),
				grid: cloneGrid(grid),
				invalidCells: getInvalidCells(),
				won: isSolved(),
			};
		},

		/**
		 * 执行一次用户输入。
		 *
		 * 这里不会抛出“固定格不可编辑”这种业务错误，而是返回 `false`
		 * 告诉上层这次输入没有产生状态变化，便于 UI 流程直接消费。
		 *
		 * @param {{ row: number, col: number, value: number }} move
		 * @returns {boolean}
		 */
		guess(move) {
			const { row, col, value } = normalizeMove(move);
			if (!isEditable(row, col) || grid[row][col] === value) {
				return false;
			}

			grid[row][col] = value;
			return true;
		},

		/**
		 * 创建当前对象的独立副本。
		 *
		 * @returns {ReturnType<typeof createSudoku>}
		 */
		clone() {
			return createSudokuFromJSON(toJSON());
		},

		toJSON,

		/**
		 * 返回便于调试的文本棋盘，空格使用 `.` 表示。
		 *
		 * @returns {string}
		 */
		toString() {
			return grid
				.map(row => row.map(cell => (cell === 0 ? '.' : String(cell))).join(' '))
				.join('\n');
		},
	};
}

/**
 * 从 JSON 数据恢复 `Sudoku` 领域对象。
 *
 * @param {{ grid: number[][], puzzleGrid?: number[][], initialGrid?: number[][] }} json
 * @returns {ReturnType<typeof createSudoku>}
 */
export function createSudokuFromJSON(json) {
	if (!json || typeof json !== 'object') {
		throw new Error('Sudoku JSON must be an object.');
	}

	const grid = json.grid;
	const puzzleGrid = Array.isArray(json.puzzleGrid)
		? json.puzzleGrid
		: (Array.isArray(json.initialGrid) ? json.initialGrid : json.grid);

	assertGrid(grid);
	assertGrid(puzzleGrid, 'Sudoku puzzle grid');
	assertPuzzleCompatibility(puzzleGrid, grid);

	const sudoku = createSudoku(puzzleGrid);
	// 先从题面固定格创建对象，再把玩家输入逐个回放回去，
	// 这样恢复过程仍然经过领域规则，而不是直接篡改内部状态。
	for (let row = 0; row < 9; row++) {
		for (let col = 0; col < 9; col++) {
			if (puzzleGrid[row][col] === 0 && grid[row][col] !== puzzleGrid[row][col]) {
				sudoku.guess({ row, col, value: grid[row][col] });
			}
		}
	}

	return sudoku;
}

/**
 * 校验传入对象是否满足 `Game` 所需的最小领域接口。
 *
 * @param {unknown} sudoku
 */
function assertSudokuLike(sudoku) {
	if (
		!sudoku
		|| typeof sudoku.clone !== 'function'
		|| typeof sudoku.guess !== 'function'
		|| typeof sudoku.toJSON !== 'function'
		|| typeof sudoku.getState !== 'function'
	) {
		throw new Error('createGame requires a sudoku domain object.');
	}
}

/**
 * `Game` 的统一构造入口。
 *
 * `createGame` 和 `createGameFromJSON` 都复用这里，避免两套
 * undo/redo 逻辑漂移。
 *
 * @param {{
 *   sudoku: ReturnType<typeof createSudoku>,
 *   undoStack?: Array<{ grid: number[][], puzzleGrid: number[][] }>,
 *   redoStack?: Array<{ grid: number[][], puzzleGrid: number[][] }>
 * }} options
 * @returns {{
 *   getSudoku: () => ReturnType<typeof createSudoku>,
 *   getState: () => { puzzleGrid: number[][], grid: number[][], invalidCells: string[], won: boolean, canUndo: boolean, canRedo: boolean },
 *   guess: (move: { row: number, col: number, value: number }) => boolean,
 *   undo: () => boolean,
 *   redo: () => boolean,
 *   canUndo: () => boolean,
 *   canRedo: () => boolean,
 *   toJSON: () => { sudoku: { grid: number[][], puzzleGrid: number[][] }, undoStack: Array<{ grid: number[][], puzzleGrid: number[][] }>, redoStack: Array<{ grid: number[][], puzzleGrid: number[][] }> },
 *   toString: () => string
 * }}
 */
function createGameCore({ sudoku, undoStack = [], redoStack = [] }) {
	assertSudokuLike(sudoku);

	let currentSudoku = sudoku.clone();
	let undoHistory = undoStack.map(cloneSnapshot);
	let redoHistory = redoStack.map(cloneSnapshot);

	/**
	 * 用新的 `Sudoku` 实例替换当前局面。
	 *
	 * @param {ReturnType<typeof createSudoku>} nextSudoku
	 */
	function replaceSudoku(nextSudoku) {
		currentSudoku = nextSudoku;
	}

	/**
	 * 导出供 UI 直接订阅的纯数据状态。
	 *
	 * @returns {{ puzzleGrid: number[][], grid: number[][], invalidCells: string[], won: boolean, canUndo: boolean, canRedo: boolean }}
	 */
	function getState() {
		const sudokuState = currentSudoku.getState();
		return {
			...sudokuState,
			canUndo: undoHistory.length > 0,
			canRedo: redoHistory.length > 0,
		};
	}

	return {
		/**
		 * 返回当前 `Sudoku` 的独立副本，避免外部直接拿到内部引用。
		 *
		 * @returns {ReturnType<typeof createSudoku>}
		 */
		getSudoku() {
			return currentSudoku.clone();
		},

		getState,

		/**
		 * 记录一次新的输入，并在成功后清空 redo 历史。
		 *
		 * @param {{ row: number, col: number, value: number }} move
		 * @returns {boolean}
		 */
		guess(move) {
			const snapshot = snapshotSudoku(currentSudoku);
			const changed = currentSudoku.guess(move);
			if (!changed) {
				return false;
			}

			// 只有真正发生修改时才入栈，否则会污染历史记录。
			undoHistory.push(snapshot);
			redoHistory = [];
			return true;
		},

		/**
		 * 撤销最近一次成功输入。
		 *
		 * @returns {boolean}
		 */
		undo() {
			if (undoHistory.length === 0) {
				return false;
			}

			// undo 的本质是：当前局面进入 redo，历史顶部快照恢复为当前局面。
			redoHistory.push(snapshotSudoku(currentSudoku));
			replaceSudoku(restoreSudoku(undoHistory.pop()));
			return true;
		},

		/**
		 * 重做最近一次被撤销的输入。
		 *
		 * @returns {boolean}
		 */
		redo() {
			if (redoHistory.length === 0) {
				return false;
			}

			// redo 与 undo 对称：先保存当前局面，再恢复 redo 栈顶部快照。
			undoHistory.push(snapshotSudoku(currentSudoku));
			replaceSudoku(restoreSudoku(redoHistory.pop()));
			return true;
		},

		/**
		 * 当前是否仍有可撤销的历史。
		 *
		 * @returns {boolean}
		 */
		canUndo() {
			return undoHistory.length > 0;
		},

		/**
		 * 当前是否仍有可重做的历史。
		 *
		 * @returns {boolean}
		 */
		canRedo() {
			return redoHistory.length > 0;
		},

		/**
		 * 将整局游戏序列化为纯数据。
		 *
		 * @returns {{ sudoku: { grid: number[][], puzzleGrid: number[][] }, undoStack: Array<{ grid: number[][], puzzleGrid: number[][] }>, redoStack: Array<{ grid: number[][], puzzleGrid: number[][] }> }}
		 */
		toJSON() {
			return {
				sudoku: snapshotSudoku(currentSudoku),
				undoStack: undoHistory.map(cloneSnapshot),
				redoStack: redoHistory.map(cloneSnapshot),
			};
		},

		/**
		 * 返回包含历史信息的调试字符串。
		 *
		 * @returns {string}
		 */
		toString() {
			return [
				'Game',
				`undo=${undoHistory.length}`,
				`redo=${redoHistory.length}`,
				`invalid=${currentSudoku.getInvalidCells().length}`,
				currentSudoku.toString(),
			].join('\n');
		},
	};
}

/**
 * 根据当前 `Sudoku` 创建一局新的游戏会话。
 *
 * @param {{ sudoku: ReturnType<typeof createSudoku> }} options
 * @returns {ReturnType<typeof createGameCore>}
 */
export function createGame({ sudoku }) {
	return createGameCore({ sudoku });
}

/**
 * 从 JSON 数据恢复整个游戏会话。
 *
 * @param {{
 *   sudoku: { grid: number[][], puzzleGrid?: number[][] },
 *   undoStack?: Array<{ grid: number[][], puzzleGrid?: number[][] }>,
 *   redoStack?: Array<{ grid: number[][], puzzleGrid?: number[][] }>
 * }} json
 * @returns {ReturnType<typeof createGameCore>}
 */
export function createGameFromJSON(json) {
	if (!json || typeof json !== 'object') {
		throw new Error('Game JSON must be an object.');
	}

	const currentSudoku = createSudokuFromJSON(json.sudoku);
	const fallbackPuzzleGrid = currentSudoku.getPuzzleGrid();

	return createGameCore({
		sudoku: currentSudoku,
		undoStack: normalizeSnapshotList(json.undoStack, fallbackPuzzleGrid),
		redoStack: normalizeSnapshotList(json.redoStack, fallbackPuzzleGrid),
	});
}
