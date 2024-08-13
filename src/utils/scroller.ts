// function scrollSmoothly(element: HTMLElement, speed: number, y: number): void {
//   let scroller = TASKS.get(element);
//   if (!scroller) {
//     scroller = new Scroller(element);
//     TASKS.set(element, scroller);
//     // if element is removed
//   }
//   scroller.step = speed;
//   scroller.scroll(y).then(() => element.dispatchEvent(new CustomEvent("smoothlyscrollend")));
// }

// function scrollTerminate(element: HTMLElement): void {
//   const scroller = TASKS.get(element);
//   if (scroller) {
//     scroller.scrolling = false;
//   }
// }

// const TASKS = new WeakMap<HTMLElement, Scroller>();

export class Scroller {
  element: HTMLElement;
  scrolling: boolean = false;
  step: number; // [1, 100]
  distance: number = 0;
  additional: number = 0;
  lastDirection: "up" | "down" | undefined;
  directionChanged: boolean = false;
  constructor(element: HTMLElement, step?: number) {
    this.element = element;
    this.step = step || 1;
  }

  scroll(y: number): Promise<void> {
    let resolve: () => void;
    const promise = new Promise<void>((r) => resolve = r);
    this.distance = Math.abs(y);
    if (this.scrolling || this.distance <= 0) {
      this.additional = 0; // disable additional temporary
      return promise;
    }
    const sign = y / this.distance;
    const direction = y < 0 ? "up" : "down";
    this.directionChanged = this.lastDirection !== undefined && this.lastDirection !== direction;
    this.lastDirection = direction;
    this.additional = 0;
    this.scrolling = true;
    const scrolled = () => {
      this.scrolling = false;
      this.directionChanged = false;
      this.lastDirection = undefined;
      this.distance = 0;
      resolve?.();
    };
    const doFrame = () => {
      if (!this.scrolling) return scrolled();
      this.distance -= this.step + this.additional;
      let scrollTop = this.element.scrollTop + ((this.step + this.additional) * sign);
      scrollTop = Math.max(scrollTop, 0);
      scrollTop = Math.min(scrollTop, this.element.scrollHeight - this.element.clientHeight);
      this.element.scrollTop = scrollTop;
      if (this.distance <= 0) return scrolled();
      if (scrollTop === 0 || scrollTop === this.element.scrollHeight - this.element.clientHeight) return scrolled();
      if (this.directionChanged) return scrolled();
      window.requestAnimationFrame(doFrame);
    }
    window.requestAnimationFrame(doFrame);
    return promise;
  }
}

// class Timer {
//   interval: number = 1;
//   last: number;
//   endAt: number;
//   constructor(duration: number, interval?: number) {
//     const now = Date.now();
//     if (interval) {
//       this.interval = interval;
//     }
//     this.last = now;
//     this.endAt = now + duration;
//   }

//   tick(): [boolean, boolean] {
//     const now = Date.now();
//     let ok = now >= this.last + this.interval;
//     if (ok) {
//       this.last = now;
//     }
//     let finished = now >= this.endAt;
//     return [ok, finished]
//   }

//   extend(duration: number) {
//     this.endAt = this.last + duration;
//   }
// }

export default {
  Scroller,
};

