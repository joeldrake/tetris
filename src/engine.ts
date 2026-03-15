import { TETROMINOES } from './pieces';
import { EventEmitter } from './emitter';

type ActivePiece = { type: number; rotation: number; x: number; y: number };
type NextPiece = { type: number; rotation: number };
type Action = 'left' | 'right' | 'rotate' | 'down' | 'drop' | 'pause';

// ═══════════════════════════════════════════════════
//  TetrisEngine  (engine.js)
//  Pure game logic — zero DOM dependencies.
//  Communicates only through the injected EventEmitter.
//
//  Events emitted:
//    'stateChanged' → full game state snapshot
//    'linesCleared' → number of lines cleared
//    'gameOver'     → { score }
// ═══════════════════════════════════════════════════
export class TetrisEngine {
  static COLS = 10;
  static ROWS = 20;
  static SCORE = [0, 100, 300, 500, 800]; // per lines cleared × level

  // Private state
  #board!: (string | null)[][]; // null or color string per cell
  #piece!: ActivePiece;
  #next!: NextPiece;
  #score!: number;
  #level!: number;
  #lines!: number;
  #paused = false;
  #gameOver = false;
  #tickId: ReturnType<typeof setInterval> | undefined = undefined;
  #em: EventEmitter;

  constructor(emitter: EventEmitter) {
    this.#em = emitter;
  }

  // Public API ─────────────────────────────────────

  start(): void {
    clearInterval(this.#tickId);
    this.#board = Array.from({ length: TetrisEngine.ROWS }, () => Array(TetrisEngine.COLS).fill(null));
    this.#score = 0;
    this.#level = 1;
    this.#lines = 0;
    this.#paused = false;
    this.#gameOver = false;
    this.#next = this.#rand();
    this.#spawn();
    this.#startLoop();
    this.#emit();
  }

  input(action: Action): void {
    if (this.#gameOver) return;
    if (action === 'pause') {
      this.#paused = !this.#paused;
      this.#emit();
      return;
    }
    if (this.#paused) return;

    switch (action) {
      case 'left':
        this.#move(-1, 0);
        break;
      case 'right':
        this.#move(1, 0);
        break;
      case 'rotate':
        this.#rotate();
        break;
      case 'down':
        this.#gravity();
        return; // emits internally
      case 'drop':
        this.#drop();
        return; // emits internally
    }
    this.#emit();
  }

  // Private ────────────────────────────────────────

  #rand(): NextPiece {
    return { type: Math.floor(Math.random() * TETROMINOES.length), rotation: 0 };
  }

  #spawn(): void {
    this.#piece = { ...this.#next, x: 3, y: 0 };
    this.#next = this.#rand();
    if (this.#collides(this.#piece)) {
      this.#gameOver = true;
      clearInterval(this.#tickId);
      this.#em.emit('gameOver', { score: this.#score });
    }
  }

  #startLoop(): void {
    clearInterval(this.#tickId);
    const ms = Math.max(80, 800 - (this.#level - 1) * 72);
    this.#tickId = setInterval(() => this.#tick(), ms);
  }

  #tick(): void {
    if (this.#paused || this.#gameOver) return;
    this.#gravity();
  }

  #gravity(): void {
    if (this.#move(0, 1)) {}
    else this.#lock();
    this.#emit();
  }

  #move(dx: number, dy: number): boolean {
    const p = { ...this.#piece, x: this.#piece.x + dx, y: this.#piece.y + dy };
    if (this.#collides(p)) return false;
    this.#piece = p;
    return true;
  }

  #rotate(): void {
    const nextRot = (this.#piece.rotation + 1) % 4;
    const base = { ...this.#piece, rotation: nextRot };
    // Try base position, then wall-kick offsets
    const kicks: [number, number][] = [
      [0, 0],
      [-1, 0],
      [1, 0],
      [0, -1],
      [-2, 0],
      [2, 0],
    ];
    for (const [kx, ky] of kicks) {
      const p = { ...base, x: base.x + kx, y: base.y + ky };
      if (!this.#collides(p)) {
        this.#piece = p;
        return;
      }
    }
  }

  #drop(): void {
    while (this.#move(0, 1)) {}
    this.#lock();
    this.#emit();
  }

  #lock(): void {
    const { type, rotation, x, y } = this.#piece;
    const color = TETROMINOES[type].color;
    for (const [dr, dc] of TETROMINOES[type].cells[rotation]) {
      const r = y + dr,
        c = x + dc;
      if (r >= 0) this.#board[r][c] = color;
    }
    const cleared = this.#clearLines();
    if (cleared > 0) {
      this.#score += TetrisEngine.SCORE[cleared] * this.#level;
      this.#lines += cleared;
      const newLevel = Math.floor(this.#lines / 10) + 1;
      if (newLevel !== this.#level) {
        this.#level = newLevel;
        this.#startLoop();
      }
      this.#em.emit('linesCleared', cleared);
    }
    this.#spawn();
  }

  #clearLines(): number {
    let n = 0;
    for (let r = TetrisEngine.ROWS - 1; r >= 0; r--) {
      if (this.#board[r].every((c) => c !== null)) {
        this.#board.splice(r, 1);
        this.#board.unshift(Array(TetrisEngine.COLS).fill(null));
        n++;
        r++; // re-check same index after removal
      }
    }
    return n;
  }

  #ghostY(): number {
    let gy = this.#piece.y;
    while (true) {
      const p = { ...this.#piece, y: gy + 1 };
      if (this.#collides(p)) break;
      gy++;
    }
    return gy;
  }

  #collides({ type, rotation, x, y }: ActivePiece): boolean {
    for (const [dr, dc] of TETROMINOES[type].cells[rotation]) {
      const r = y + dr,
        c = x + dc;
      if (c < 0 || c >= TetrisEngine.COLS) return true;
      if (r >= TetrisEngine.ROWS) return true;
      if (r >= 0 && this.#board[r][c] !== null) return true;
    }
    return false;
  }

  // State snapshot — renderer only ever sees this object
  #emit(): void {
    this.#em.emit('stateChanged', {
      board: this.#board.map((row) => [...row]),
      piece: { ...this.#piece },
      next: { ...this.#next },
      ghostY: this.#ghostY(),
      score: this.#score,
      level: this.#level,
      lines: this.#lines,
      paused: this.#paused,
    });
  }
}
