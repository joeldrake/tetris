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
            <ol id="go-toplist" class="go-toplist"></ol>
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
;

    const HS_KEY = 'tetris-highscore-v2';
    type HighScore = { score: number; date: string };

    function getTopList(): HighScore[] {
      const raw = localStorage.getItem(HS_KEY);
      return raw ? JSON.parse(raw) : [];
    }

    function saveTopList(list: HighScore[]) {
      localStorage.setItem(HS_KEY, JSON.stringify(list));
    }

    const goToplistEl = shadow.getElementById('go-toplist')!;

    emitter.on('stateChanged', (state: GameState) => {
      renderer.render(state);
      scoreEl.textContent = String(state.score);
      startBtn.textContent = 'RESET';
      pauseBtn.textContent = state.paused ? '▶' : '⏸';
    });

    emitter.on('gameOver', ({ score }: { score: number }) => {
      const list = getTopList();
      const entry: HighScore = { score, date: new Date().toLocaleDateString('sv-SE') };
      list.push(entry);
      list.sort((a, b) => b.score - a.score);
      const top10 = list.slice(0, 10);
      saveTopList(top10);

      const rank = top10.findIndex((e) => e === entry) + 1;
      goScoreEl.textContent = rank > 0 ? `POÄNG: ${score} (#${rank})` : `POÄNG: ${score}`;

      goToplistEl.innerHTML = top10
        .map((e) => `<li class="${e === entry ? 'go-toplist-new' : ''}">${e.score} <span class="go-toplist-date">${e.date}</span></li>`)
        .join('');

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
