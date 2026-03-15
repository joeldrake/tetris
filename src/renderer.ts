import { TETROMINOES } from './pieces';
import { TetrisEngine } from './engine';

// ═══════════════════════════════════════════════════
//  Renderer  (renderer.ts)
//  Knows nothing about game logic.
//  Receives state snapshots → updates HTML div cells.
//  Swap this class for any other renderer without
//  touching TetrisEngine at all.
// ═══════════════════════════════════════════════════

export type GameState = {
  board: (string | null)[][];
  piece: { type: number; rotation: number; x: number; y: number };
  next: { type: number; rotation: number };
  ghostY: number;
  score: number;
  level: number;
  lines: number;
  paused: boolean;
};

export class Renderer {
  #cells: HTMLElement[]; // ROWS × COLS, flat array
  #nextCells: HTMLElement[]; // 4 × 4, flat array
  #pauseOverlay: HTMLElement;

  constructor(boardEl: HTMLElement, nextEl: HTMLElement) {
    boardEl.classList.add('board');

    this.#cells = Array.from({ length: TetrisEngine.ROWS * TetrisEngine.COLS }, () => {
      const el = document.createElement('div');
      el.classList.add('cell');
      boardEl.appendChild(el);
      return el;
    });

    this.#pauseOverlay = document.createElement('div');
    this.#pauseOverlay.classList.add('pause-overlay');
    this.#pauseOverlay.textContent = 'PAUSED';
    boardEl.appendChild(this.#pauseOverlay);

    nextEl.classList.add('next');

    this.#nextCells = Array.from({ length: 4 * 4 }, () => {
      const el = document.createElement('div');
      el.classList.add('ncell');
      nextEl.appendChild(el);
      return el;
    });
  }

  // Single public method — called on every stateChanged event
  render(state: GameState): void {
    this.#drawBoard(state);
    this.#drawNext(state.next);
  }

  // ── Board ───────────────────────────────────────

  #drawBoard({ board, piece, ghostY, paused }: GameState): void {
    const COLS = TetrisEngine.COLS;
    const tet = TETROMINOES[piece.type];

    const activeSet = new Set<number>();
    const ghostSet = new Set<number>();

    for (const [dr, dc] of tet.cells[piece.rotation]) {
      const col = piece.x + dc;
      if (piece.y + dr >= 0) activeSet.add((piece.y + dr) * COLS + col);
      if (ghostY !== piece.y && ghostY + dr >= 0) ghostSet.add((ghostY + dr) * COLS + col);
    }

    for (let r = 0; r < TetrisEngine.ROWS; r++) {
      for (let c = 0; c < COLS; c++) {
        const idx = r * COLS + c;
        const el = this.#cells[idx];

        if (activeSet.has(idx)) {
          this.#paintFilled(el, tet.color);
        } else if (ghostSet.has(idx)) {
          this.#paintGhost(el, tet.color);
        } else if (board[r][c]) {
          this.#paintFilled(el, board[r][c]!);
        } else {
          this.#clearCell(el);
        }
      }
    }

    this.#pauseOverlay.classList.toggle('visible', paused);
  }

  // ── Next-piece preview ──────────────────────────

  #drawNext(next: { type: number; rotation: number }): void {
    const tet = TETROMINOES[next.type];
    const filled = new Set(tet.cells[0].map(([r, c]) => r * 4 + c));

    for (let i = 0; i < 16; i++) {
      if (filled.has(i)) {
        this.#paintFilled(this.#nextCells[i], tet.color);
      } else {
        this.#clearCell(this.#nextCells[i]);
      }
    }
  }

  // ── Cell helpers ────────────────────────────────

  #paintFilled(el: HTMLElement, color: string): void {
    el.style.setProperty('--color', color);
    el.classList.remove('ghost');
    el.classList.add('filled');
  }

  #paintGhost(el: HTMLElement, color: string): void {
    el.style.setProperty('--color', color);
    el.classList.remove('filled');
    el.classList.add('ghost');
  }

  #clearCell(el: HTMLElement): void {
    el.style.removeProperty('--color');
    el.classList.remove('filled', 'ghost');
  }
}
