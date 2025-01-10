export class Scroller {
  private element: HTMLElement;
  scrolling: boolean = false;
  step: number; // [1, 100]
  private distance: number = 0;
  private additional: number = 0;
  private lastDirection: "up" | "down" | undefined;
  private directionChanged: boolean = false;
  private scrollMargin: () => number;
  private maxScrollMargin: () => number;
  private setScrollMargin: (margin: number) => void;
  constructor(element: HTMLElement, step?: number, mode?: "y" | "x") {
    this.element = element;
    this.step = step || 1;
    if (mode && mode === "x") {
      this.scrollMargin = () => this.element.scrollLeft;
      this.maxScrollMargin = () => this.element.scrollWidth - this.element.clientWidth;
      this.setScrollMargin = (margin) => this.element.scrollLeft = margin;
    } else {
      this.scrollMargin = () => this.element.scrollTop;
      this.maxScrollMargin = () => this.element.scrollHeight - this.element.clientHeight;
      this.setScrollMargin = (margin) => this.element.scrollTop = margin;
    }
  }

  scroll(delta: number, step?: number): Promise<void> {
    if (step) this.step = step;
    let resolve: () => void;
    const promise = new Promise<void>((r) => resolve = r);
    this.distance = Math.abs(delta);
    const direction = delta < 0 ? "up" : "down";
    this.directionChanged = this.lastDirection !== undefined && this.lastDirection !== direction;
    if (this.scrolling || this.distance <= 0) {
      // this.additional = 0; // disable additional temporary
      return promise;
    }
    const sign = delta / this.distance;
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
    // console.log(`scroller: delta: ${delta}, step: ${step}, distance: ${this.distance}, scrolling: ${this.scrolling}, direction: ${direction}, changed: ${this.directionChanged}`);
    const doFrame = () => {
      if (!this.scrolling) return scrolled();
      this.distance -= this.step + this.additional;
      let scrollMargin = this.scrollMargin() + ((this.step + this.additional) * sign);
      scrollMargin = Math.max(scrollMargin, 0);
      scrollMargin = Math.min(scrollMargin, this.maxScrollMargin());
      this.setScrollMargin(scrollMargin);
      if (this.distance <= 0 || this.directionChanged || scrollMargin === 0 || scrollMargin === this.maxScrollMargin()) return scrolled();
      window.requestAnimationFrame(doFrame);
    }
    window.requestAnimationFrame(doFrame);
    return promise;
  }
}

export default {
  Scroller,
};

