import { EventEmitter } from './emitter';
import { TetrisEngine } from './engine';
import { Renderer } from './renderer';
import type { GameState } from './renderer';
import styles from './styles.css?inline';

class Tetris extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
  }

  connectedCallback() {
    this.#sendEvent('tetris:mounted');
    this.#init();
  }

  disconnectedCallback() {
    this.#sendEvent('tetris:unmounted');
  }

  #sendEvent(eventName: string) {
    this.dispatchEvent(new CustomEvent(eventName, { bubbles: true, composed: true }));
  }

  #init() {
    const shadow = this.shadowRoot!;

    // ── HTML structure ────────────────────────────
    shadow.innerHTML = `
      <style>${styles}</style>
      <button id="btn-start">Start</button>
      <div class="game-wrapper">
        <div id="next"></div>
        <div id="board"></div>
      </div>
    `;

    const boardEl = shadow.getElementById('board')!;
    const nextEl = shadow.getElementById('next')!;

    // ── Wire up engine + renderer ─────────────────
    const emitter = new EventEmitter();
    const engine = new TetrisEngine(emitter);
    const renderer = new Renderer(boardEl, nextEl);

    emitter.on('stateChanged', (state: GameState) => {
      renderer.render(state);
    });

    emitter.on('gameOver', ({ score }: { score: number }) => {
      console.log('score', score);
    });

    shadow.getElementById('btn-start')!.addEventListener('click', () => engine.start());

    // ── Keyboard input ───────────────────────────
    const KEY_MAP: Record<string, string> = {
      ArrowLeft: 'left',
      ArrowRight: 'right',
      ArrowUp: 'rotate',
      ArrowDown: 'down',
      ' ': 'drop',
      p: 'pause',
      P: 'pause',
    };

    document.addEventListener('keydown', (e) => {
      const action = KEY_MAP[e.key];
      if (action) {
        e.preventDefault();
        engine.input(action as Parameters<typeof engine.input>[0]);
      }
    });
  }
}

customElements.define('web-tetris', Tetris);
