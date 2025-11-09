// Keeps a totally ordered list of operations per room
class DrawingState {
  constructor() {
    this.ops = [];       // stroke:start/append/end, undo/redo/clear (logical)
    this.undoStack = []; // groups of ops removed by undo
  }

  apply(op) {
    switch (op.type) {
      case 'stroke:start':
      case 'stroke:append':
      case 'stroke:end':
      case 'clear':
        this.ops.push(op);
        this.undoStack = [];
        return [op];

      case 'undo': {
        // Remove until previous stroke:start or last clear
        for (let i = this.ops.length - 1; i >= 0; i--) {
          const cand = this.ops[i];
          if (cand.type === 'stroke:start' || cand.type === 'clear') {
            const removed = this.ops.splice(i);
            this.undoStack.push(removed);
            return [{ type: 'undo' }];
          }
        }
        return [];
      }

      case 'redo': {
        if (this.undoStack.length > 0) {
          const grp = this.undoStack.pop();
          this.ops.push(...grp);
          return [{ type: 'redo' }];
        }
        return [];
      }

      default:
        return [];
    }
  }

  full() { return { ops: this.ops }; }
}

module.exports = DrawingState;
