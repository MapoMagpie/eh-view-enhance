export type Handle = {
  zoom?: (distance: number, ev: TouchEvent) => void;
  swipe?: (direction: "L" | "R" | "D" | "U", ev: TouchEvent) => void;
  start?: (distance: number, ev: TouchEvent) => void;
  end?: (ev: TouchEvent) => void;
}

export class TouchPoint {
  id: number;
  x: number;
  y: number;

  constructor(id: number, x: number, y: number) {
    this.id = id;
    this.x = x;
    this.y = y;
  }

  static from(tp: Touch): TouchPoint {
    return new TouchPoint(tp.identifier, tp.clientX, tp.clientY);
  }

  distance(other: TouchPoint): number {
    return Math.sqrt((this.x - other.x) ** 2 + (this.y - other.y) ** 2);
  }

  direction(other: TouchPoint): "L" | "R" | "D" | "U" {
    const x = this.x - other.x;
    const y = this.y - other.y;
    const absX = Math.abs(x);
    const absY = Math.abs(y);
    if (absX > absY) {
      return x > 0 ? "L" : "R";
    } else {
      return y > 0 ? "U" : "D";
    }
  }
}

export class TouchManager {
  element: HTMLElement;
  tpCache: TouchPoint[] = [];
  trail: TouchPoint[] = [];
  handlers: Handle;
  constructor(element: HTMLElement, handles: Handle) {
    this.element = element;
    this.handlers = handles;
    this.element.addEventListener("touchstart", (ev) => this.start(ev));
    this.element.addEventListener("touchmove", (ev) => this.move(ev));
    this.element.addEventListener("touchend", (ev) => this.end(ev));
    // this.element.addEventListener("touchcancel", (ev) => {
    //   console.log("touch canceled: ", ev);
    // });
  }

  start(ev: TouchEvent) {
    this.tpCache = Array.from(ev.targetTouches).map(TouchPoint.from);
    this.trail = [this.tpCache[0]];
    let distance = 0;
    if (this.tpCache.length === 2) {
      distance = this.tpCache[0].distance(this.tpCache[1]);
    }
    this.handlers.start?.(distance, ev);
  }

  move(ev: TouchEvent) {
    if (this.tpCache.length === 1) {
      const last = this.trail[this.trail.length - 1];
      let tp = TouchPoint.from(ev.targetTouches[0]);
      const distance = last.distance(tp);
      if (distance > 30) {
        this.trail.push(tp);
      }
      return;
    }
    if (this.tpCache.length === 2 && ev.targetTouches.length === 2) {
      const tp1 = TouchPoint.from(ev.targetTouches[0]);
      const tp2 = TouchPoint.from(ev.targetTouches[1]);
      this.handlers.zoom?.(tp1.distance(tp2), ev);
      return;
    }
  }

  end(ev: TouchEvent) {
    // console.log("touch end: ", ev);
    if (this.tpCache.length === 1 && this.trail.length > 1) {
      let direction = undefined;
      for (let i = 0, j = 1; j < this.trail.length; i++, j++) {
        if (!direction) {
          direction = this.trail[i].direction(this.trail[j]);
        } else {
          if (this.trail[i].direction(this.trail[j]) !== direction) return;
        }
      }
      this.handlers.swipe?.(direction!, ev);
    }
    this.trail = [];
    this.tpCache = [];
    this.handlers.end?.(ev);
  }

}

