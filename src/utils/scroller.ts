function animatedScrollBy(element: HTMLElement, y: number): void {
  let timer = TASKS.get(element);
  if (timer) return;

  timer = new Timer(y, element.scrollTop);
  TASKS.set(element, timer);
  function step(timeStamp: number) {
    if (!timer) return;
    if (timer.tick(timeStamp)) {
      element.scrollTop = timer.scrollTop + (timer.moved * timer.numberSign);
    }
    if (timer.elapsed >= timer.duration || timer.done) {
      TASKS.delete(element);
    } else {
      window.requestAnimationFrame(step);
    }
  }
  window.requestAnimationFrame(step);
}

export default {
  animatedScrollBy,
};

const TASKS = new Map<HTMLElement, Timer>();

class Timer {
  rate: number = 5;
  distance: number;
  moved: number = 0;
  scrollTop: number;
  start?: number;
  previousTimeStamp?: number;
  elapsed: number = 0;
  done: boolean = false;
  duration: number;
  numberSign: number = 1;
  constructor(distance: number, scrollTop: number) {
    this.numberSign = distance > 0 ? 1 : -1;
    this.distance = Math.abs(distance);
    this.scrollTop = scrollTop;
    this.duration = this.distance / this.rate;
  }

  tick(timeStamp: number): boolean {
    if (this.start === undefined) {
      this.start = timeStamp;
    }
    this.elapsed = timeStamp - this.start;
    const moved = Math.min(this.rate * this.elapsed, this.distance);
    const ok = timeStamp !== this.previousTimeStamp && moved !== this.moved;
    this.moved = moved;
    this.done = this.moved >= this.distance;
    this.previousTimeStamp = timeStamp;
    return ok;
  }

}

