export type Handle = {
  zoom?: (distance: number, ev: TouchEvent) => void;
  swipe?: (direction: "L" | "R" | "D" | "U", ev: TouchEvent) => void;
  rotate?: (clockwise: boolean, angle: number, ev: TouchEvent) => void;
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
    return calculateDistance({ x: this.x, y: this.y }, { x: other.x, y: other.y });
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
  trail: Record<number, TouchPoint[]> = {};
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
    const tps = Array.from(ev.targetTouches).map(TouchPoint.from);
    this.trail = tps.reduce<Record<number, TouchPoint[]>>((prev, curr) => {
      prev[curr.id] = [curr];
      return prev
    }, {});
    let distance = 0;
    if (tps.length === 2) {
      distance = tps[0].distance(tps[1]);
    }
    this.handlers.start?.(distance, ev);
  }

  move(ev: TouchEvent) {
    const tps = Array.from(ev.targetTouches).map(TouchPoint.from);
    tps.forEach(tp => {
      const trail = this.trail[tp.id];
      const last = trail[trail.length - 1];
      const distance = last.distance(tp);
      if (distance > 30) {
        trail.push(tp);
      }
    });
    if (Object.keys(this.trail).length === 2 && tps.length === 2) {
      const tp1 = tps[0];
      const tp2 = tps[1];
      this.handlers.zoom?.(tp1.distance(tp2), ev);
      return;
    }
  }

  end(ev: TouchEvent) {
    // console.log("touch end: ", ev);
    const tpKeys = Object.keys(this.trail).map(Number);
    if (tpKeys.length === 1) {
      if (this.trail[tpKeys[0]].length > 1) {
        const trail = this.trail[tpKeys[0]];
        let direction = undefined;
        for (let i = 0, j = 1; j < trail.length; i++, j++) {
          if (!direction) {
            direction = trail[i].direction(trail[j]);
          } else {
            if (trail[i].direction(trail[j]) !== direction) return;
          }
        }
        this.handlers.swipe?.(direction!, ev);
      }
    }
    if (tpKeys.length === 2) {
      // is rotate?
      const trail1 = this.trail[tpKeys[0]];
      const trail2 = this.trail[tpKeys[1]];
      if (trail1.length > 1 && trail2.length > 1) {
        const line1 = [trail1[0], trail1[trail1.length - 1]];
        const line2 = [trail2[0], trail2[trail2.length - 1]];
        const { angle, clockwise } = calculateAngle(line1, line2);
        this.handlers.rotate?.(clockwise, angle, ev);
      }
    }
    this.trail = {};
    this.handlers.end?.(ev);
  }

}
type Point = { x: number, y: number }
export function calculateDistance(start: Point, end: Point): number {
  const dx = start.x - end.x;
  const dy = start.y - end.y;
  return Math.sqrt(dx * dx + dy * dy);
}

function calculateAngle(line1: Point[], line2: Point[]): { angle: number, clockwise: boolean } {
  if (line1.length !== 2 || line2.length !== 2) throw new Error("line1 or line2 length must be 2");
  [line1, line2].forEach(([start, end]) => {
    if (start.x === end.x && start.y === end.y) throw new Error(`start at ${start.toString()}, end at ${end.toString()}, not line`);
  })
  const vector1 = { x: line1[1].x - line1[0].x, y: line1[1].y - line1[0].y };
  const vector2 = { x: line2[1].x - line2[0].x, y: line2[1].y - line2[0].y };

  const dotProduct = vector1.x * vector2.x + vector1.y * vector2.y;

  const magnitude1 = Math.sqrt(vector1.x ** 2 + vector1.y ** 2);
  const magnitude2 = Math.sqrt(vector2.x ** 2 + vector2.y ** 2);

  const cosTheta = dotProduct / (magnitude1 * magnitude2);

  const angleInRadians = Math.acos(cosTheta);

  const crossProduct = vector1.x * vector2.y - vector1.y * vector2.x;

  const clockwise: boolean = crossProduct <= 0;

  const angle = angleInRadians * (180 / Math.PI);

  return { angle, clockwise, };
}
