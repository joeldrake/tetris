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

      <div class="board-wrapper">
        <div class="head">
          <button id="btn-start">Start</button>
          <div class="next-wrapper">
            <div id="next"></div>
          </div>
        </div>
        <div id="board"></div>
        <div class="foot">
          <button class="ctrl-btn ctrl-drop" id="btn-drop">▼▼</button>
          <div class="ctrl-dpad">
            <button class="ctrl-btn" id="btn-rotate">↑</button>
            <div class="ctrl-row">
              <button class="ctrl-btn" id="btn-left">←</button>
              <button class="ctrl-btn" id="btn-right">→</button>
            </div>
          </div>

        </div>
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

    // ── Touch / mobile buttons ───────────────────
    const mobileButtons: Array<[string, string]> = [
      ['btn-left', 'left'],
      ['btn-right', 'right'],
      ['btn-rotate', 'rotate'],
      ['btn-drop', 'drop'],
    ];
    for (const [id, action] of mobileButtons) {
      shadow.getElementById(id)!.addEventListener(
        'touchstart',
        (e) => {
          e.preventDefault();
          engine.input(action as Parameters<typeof engine.input>[0]);
        },
        { passive: false }
      );
    }

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
