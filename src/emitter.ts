type EventHandler = (data?: any) => void;

export class EventEmitter {
  #h: Record<string, EventHandler[]> = {};
  on(e: string, fn: EventHandler) {
    (this.#h[e] ??= []).push(fn);
  }
  off(e: string, fn: EventHandler) {
    this.#h[e] = this.#h[e]?.filter((f) => f !== fn);
  }
  emit(e: string, d?: any) {
    this.#h[e]?.forEach((fn) => fn(d));
  }
}
