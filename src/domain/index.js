function cloneGrid(grid) {
	return grid.map(row => row.slice());
}

function assertGrid(grid) {
	if (!Array.isArray(grid) || grid.length !== 9) {
		throw new Error('Sudoku grid must be a 9x9 array.');
	}

	for (const row of grid) {
		if (!Array.isArray(row) || row.length !== 9) {
			throw new Error('Sudoku grid must be a 9x9 array.');
		}

		for (const cell of row) {
			if (typeof cell !== 'number' || Number.isNaN(cell)) {
				throw new Error('Sudoku cells must be numbers.');
			}
		}
	}
}

function normalizeMove(move) {
	if (!move || typeof move !== 'object') {
		throw new Error('Move must be an object.');
	}

	const { row, col, value } = move;
	if (!Number.isInteger(row) || row < 0 || row > 8) {
		throw new Error('Move row must be an integer between 0 and 8.');
	}
	if (!Number.isInteger(col) || col < 0 || col > 8) {
		throw new Error('Move col must be an integer between 0 and 8.');
	}
	if (!Number.isInteger(value) || value < 0 || value > 9) {
		throw new Error('Move value must be an integer between 0 and 9.');
	}

	return { row, col, value };
}

function snapshotSudoku(sudoku) {
	// 历史记录只保存纯数据快照，避免 undo/redo 共享内部二维数组。
	return sudoku.toJSON();
}

function restoreSudoku(snapshot) {
	return createSudokuFromJSON(snapshot);
}

export function createSudoku(input) {
	assertGrid(input);
	let grid = cloneGrid(input);

	return {
		getGrid() {
			// 返回副本，避免调用方直接改坏对象内部状态。
			return cloneGrid(grid);
		},

		guess(move) {
			const { row, col, value } = normalizeMove(move);
			grid[row][col] = value;
		},

		clone() {
			return createSudoku(grid);
		},

		toJSON() {
			return {
				grid: cloneGrid(grid),
			};
		},

		toString() {
			// 用 "." 表示空格，调试时比直接输出 0 更直观。
			return grid
				.map(row => row.map(cell => (cell === 0 ? '.' : String(cell))).join(' '))
				.join('\n');
		},
	};
}

export function createSudokuFromJSON(json) {
	if (!json || typeof json !== 'object') {
		throw new Error('Sudoku JSON must be an object.');
	}

	return createSudoku(json.grid);
}

export function createGame({ sudoku }) {
	if (!sudoku || typeof sudoku.getGrid !== 'function' || typeof sudoku.toJSON !== 'function') {
		throw new Error('createGame requires a sudoku domain object.');
	}

	let currentSudoku = sudoku.clone();
	let undoStack = [];
	let redoStack = [];

	function replaceSudoku(nextSudoku) {
		currentSudoku = nextSudoku;
	}

	return {
		getSudoku() {
			return currentSudoku.clone();
		},

		guess(move) {
			// 修改前先保存整盘快照；一旦产生新输入，redo 历史就应失效。
			undoStack.push(snapshotSudoku(currentSudoku));
			redoStack = [];
			currentSudoku.guess(move);
		},

		undo() {
			if (undoStack.length === 0) {
				return;
			}

			// undo 的本质是：把当前局面放进 redo，再恢复最近一次旧快照。
			redoStack.push(snapshotSudoku(currentSudoku));
			replaceSudoku(restoreSudoku(undoStack.pop()));
		},

		redo() {
			if (redoStack.length === 0) {
				return;
			}

			// redo 与 undo 对称：先保存当前局面，再恢复 redo 栈顶部的快照。
			undoStack.push(snapshotSudoku(currentSudoku));
			replaceSudoku(restoreSudoku(redoStack.pop()));
		},

		canUndo() {
			return undoStack.length > 0;
		},

		canRedo() {
			return redoStack.length > 0;
		},

		toJSON() {
			return {
				sudoku: snapshotSudoku(currentSudoku),
				undoStack: undoStack.map(snapshot => ({
					grid: cloneGrid(snapshot.grid),
				})),
				redoStack: redoStack.map(snapshot => ({
					grid: cloneGrid(snapshot.grid),
				})),
			};
		},

		toString() {
			return [
				'Game',
				`undo=${undoStack.length}`,
				`redo=${redoStack.length}`,
				currentSudoku.toString(),
			].join('\n');
		},
	};
}

export function createGameFromJSON(json) {
	if (!json || typeof json !== 'object') {
		throw new Error('Game JSON must be an object.');
	}

	let currentSudoku = createSudokuFromJSON(json.sudoku);
	// 反序列化时先把快照重新校验并标准化，确保历史里的数据结构合法。
	let undoStack = Array.isArray(json.undoStack)
		? json.undoStack.map(snapshot => createSudokuFromJSON(snapshot).toJSON())
		: [];
	let redoStack = Array.isArray(json.redoStack)
		? json.redoStack.map(snapshot => createSudokuFromJSON(snapshot).toJSON())
		: [];

	function replaceSudoku(nextSudoku) {
		currentSudoku = nextSudoku;
	}

	return {
		getSudoku() {
			return currentSudoku.clone();
		},

		guess(move) {
			undoStack.push(snapshotSudoku(currentSudoku));
			redoStack = [];
			currentSudoku.guess(move);
		},

		undo() {
			if (undoStack.length === 0) {
				return;
			}

			redoStack.push(snapshotSudoku(currentSudoku));
			replaceSudoku(restoreSudoku(undoStack.pop()));
		},

		redo() {
			if (redoStack.length === 0) {
				return;
			}

			undoStack.push(snapshotSudoku(currentSudoku));
			replaceSudoku(restoreSudoku(redoStack.pop()));
		},

		canUndo() {
			return undoStack.length > 0;
		},

		canRedo() {
			return redoStack.length > 0;
		},

		toJSON() {
			return {
				sudoku: snapshotSudoku(currentSudoku),
				undoStack: undoStack.map(snapshot => ({
					grid: cloneGrid(snapshot.grid),
				})),
				redoStack: redoStack.map(snapshot => ({
					grid: cloneGrid(snapshot.grid),
				})),
			};
		},

		toString() {
			return [
				'Game',
				`undo=${undoStack.length}`,
				`redo=${redoStack.length}`,
				currentSudoku.toString(),
			].join('\n');
		},
	};
}
