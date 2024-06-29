import { conf } from "../config";

export function scrollSmoothly(element: HTMLElement, y: number): void {
  let scroller = TASKS.get(element);
  if (!scroller) {
    scroller = new Scroller(element);
    TASKS.set(element, scroller);
    // if element is removed
  }
  scroller.step = conf.scrollingSpeed;
  scroller.scroll(y > 0 ? "down" : "up").then(() => element.dispatchEvent(new CustomEvent("scrollend")));
}

export function scrollTerminate(element: HTMLElement): void {
  const scroller = TASKS.get(element);
  if (scroller) {
    scroller.timer = undefined;
    scroller.scrolling = false;
  }
}

const TASKS = new WeakMap<HTMLElement, Scroller>();

export class Scroller {
  element: HTMLElement;
  timer?: Timer;
  scrolling: boolean = false;
  step: number; // [1, 100]
  additional: number = 0;
  lastDirection: "up" | "down" | undefined;
  directionChanged: boolean = false;
  constructor(element: HTMLElement, step?: number) {
    this.element = element;
    this.step = step || 1;
  }

  scroll(direction: "up" | "down", duration: number = 100): Promise<void> {
    this.directionChanged = this.lastDirection !== undefined && this.lastDirection !== direction;
    this.lastDirection = direction;
    let resolve: () => void;
    const promise = new Promise<void>((r) => resolve = r);
    if (!this.timer) {
      this.timer = new Timer(duration)
    }
    if (this.scrolling) {
      this.additional = 0; // disable additional temporary
      this.timer.extend(duration);
      return promise;
    }
    this.additional = 0;
    this.scrolling = true;
    const scrolled = () => {
      this.scrolling = false;
      this.timer = undefined;
      this.directionChanged = false;
      this.lastDirection = undefined;
      resolve?.();
    };
    const doFrame = () => {
      const [ok, finished] = this.timer?.tick() ?? [false, true];
      // console.log(`timer tick [ok, finished]: [${ok}, ${finished}], now: ${Date.now()}, last: ${this.timer?.last}, endAt: ${this.timer?.endAt}`);
      if (ok) {
        let scrollTop = this.element.scrollTop + ((this.step + this.additional) * (direction === "up" ? -1 : 1));
        scrollTop = Math.max(scrollTop, 0);
        scrollTop = Math.min(scrollTop, this.element.scrollHeight - this.element.clientHeight);
        this.element.scrollTop = scrollTop;
        if (scrollTop === 0 || scrollTop === this.element.scrollHeight - this.element.clientHeight) {
          return scrolled();
        }
      }
      if (finished || this.directionChanged) return scrolled();
      window.requestAnimationFrame(doFrame);
    }
    window.requestAnimationFrame(doFrame);
    return promise;
  }
}

class Timer {
  interval: number = 1;
  last: number;
  endAt: number;
  constructor(duration: number, interval?: number) {
    const now = Date.now();
    if (interval) {
      this.interval = interval;
    }
    this.last = now;
    this.endAt = now + duration;
  }

  tick(): [boolean, boolean] {
    const now = Date.now();
    let ok = now >= this.last + this.interval;
    if (ok) {
      this.last = now;
    }
    let finished = now >= this.endAt;
    return [ok, finished]
  }

  extend(duration: number) {
    this.endAt = this.last + duration;
  }
}

export default {
  scrollSmoothly,
  scrollTerminate,
  Scroller,
};

