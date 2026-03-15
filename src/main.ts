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
          <div class="head-left">
            <div class="head-buttons">
              <button id="btn-start">START</button>
              <button id="btn-pause" class="ctrl-btn">⏸</button>
            </div>
            <div class="score-display">
              <span class="score-label">SCORE</span>
              <span id="score">0</span>
            </div>
          </div>
          <div class="next-wrapper">
            <div id="next"></div>
          </div>
        </div>
        <div id="board">
          <div id="gameover-overlay" class="gameover-overlay">
            <p class="go-title">GAME OVER</p>
            <p id="go-score"></p>
            <p id="go-highscore"></p>
          </div>
        </div>
        <div class="foot">
          <button class="ctrl-btn ctrl-drop" id="btn-drop">▼▼</button>
          <div class="ctrl-dpad">
            <button class="ctrl-btn" id="btn-rotate">↑</button>
            <div class="ctrl-row">
              <button class="ctrl-btn" id="btn-left">←</button>
              <button class="ctrl-btn" id="btn-down">↓</button>
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

    const startBtn = shadow.getElementById('btn-start')!;
    const pauseBtn = shadow.getElementById('btn-pause')!;
    const scoreEl = shadow.getElementById('score')!;
    const gameoverOverlay = shadow.getElementById('gameover-overlay')!;
    const goScoreEl = shadow.getElementById('go-score')!;
    const goHighscoreEl = shadow.getElementById('go-highscore')!;

    const HS_KEY = 'tetris-highscore';
    type HighScore = { score: number; date: string };

    function getHighScore(): HighScore | null {
      const raw = localStorage.getItem(HS_KEY);
      return raw ? JSON.parse(raw) : null;
    }

    emitter.on('stateChanged', (state: GameState) => {
      renderer.render(state);
      console.log('scoreEl', scoreEl);
      console.log('state.score', state.score);
      scoreEl.textContent = String(state.score);
      startBtn.textContent = 'RESET';
      pauseBtn.textContent = state.paused ? '▶' : '⏸';
    });

    emitter.on('gameOver', ({ score }: { score: number }) => {
      const hs = getHighScore();
      const isNew = !hs || score > hs.score;
      if (isNew) {
        localStorage.setItem(HS_KEY, JSON.stringify({ score, date: new Date().toLocaleDateString('sv-SE') }));
      }
      const current = isNew ? { score, date: new Date().toLocaleDateString('sv-SE') } : hs!;
      goScoreEl.textContent = `POÄNG: ${score}`;
      goHighscoreEl.textContent = `HIGHSCORE: ${current.score}${isNew ? ' ★' : ` (${current.date})`}`;
      gameoverOverlay.classList.add('visible');
    });

    shadow.getElementById('btn-start')!.addEventListener('click', () => {
      gameoverOverlay.classList.remove('visible');
      engine.start();
    });
    pauseBtn.addEventListener('click', () => engine.input('pause'));
    pauseBtn.addEventListener(
      'touchstart',
      (e) => {
        e.preventDefault();
        engine.input('pause');
      },
      { passive: false }
    );

    // ── Touch / mobile buttons ───────────────────
    const mobileButtons: Array<[string, string]> = [
      ['btn-left', 'left'],
      ['btn-right', 'right'],
      ['btn-down', 'down'],
      ['btn-rotate', 'rotate'],
      ['btn-drop', 'drop'],
    ];
    for (const [id, action] of mobileButtons) {
      const el = shadow.getElementById(id)!;
      el.addEventListener(
        'touchstart',
        (e) => {
          e.preventDefault();
          engine.input(action as Parameters<typeof engine.input>[0]);
        },
        { passive: false }
      );
      el.addEventListener('mousedown', (e) => {
        e.preventDefault();
        engine.input(action as Parameters<typeof engine.input>[0]);
      });
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
