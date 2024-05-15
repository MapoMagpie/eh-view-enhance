type Callbacks = {
  onStart?: (clientX: number, clientY: number) => void,
  onMoving?: (pos: AbsolutePosition) => void,
  onFinish?: (pos: AbsolutePosition) => void,
}

export type AbsolutePosition = {
  top?: number,
  left?: number,
  right?: number,
  bottom?: number,
  vw: number,
  vh: number,
}

function toPositions(vw: number, vh: number, mouseX: number, mouseY: number): AbsolutePosition {
  let pos: AbsolutePosition = { vw, vh };
  if (mouseX <= vw / 2) {
    pos.left = Math.max(mouseX, 5)
  } else {
    pos.right = Math.max(vw - mouseX, 5);
  }
  if (mouseY <= vh / 2) {
    pos.top = Math.max(mouseY, 5);
  } else {
    pos.bottom = Math.max(vh - mouseY, 5);
  }
  return pos;
}

export function dragElement(element: HTMLElement, callbacks: Callbacks, dragHub?: HTMLElement,) {
  (dragHub ?? element).addEventListener("mousedown", (event) => {
    event.preventDefault();
    const wh = window.innerHeight;
    const ww = window.innerWidth;
    const abort = new AbortController();
    callbacks.onStart?.(event.clientX, event.clientY);
    document.addEventListener("mousemove", (event) => {
      callbacks.onMoving?.(toPositions(ww, wh, event.clientX, event.clientY));
    }, { signal: abort.signal });
    document.addEventListener("mouseup", () => {
      abort.abort();
      callbacks.onFinish?.(toPositions(ww, wh, event.clientX, event.clientY));
    }, { once: true });
  });
}

type MouseMoveData = {
  start: { x: number, y: number },
  end: { x: number, y: number },
  distance: number,
  // UDLR
  direction: number;
}

// the element has added mousedown event
export function dragElementWithLine(event: MouseEvent, element: HTMLElement, lock: { x?: boolean, y?: boolean }, callback: (data: MouseMoveData) => void) {
  if (event.buttons !== 1) return;
  // create canvas from start
  document.querySelector("#drag-element-with-line")?.remove();
  const canvas = document.createElement("canvas");
  canvas.id = "drag-element-with-line";
  canvas.style.position = "fixed";
  canvas.style.zIndex = "100000";
  canvas.style.top = 0 + "px";
  canvas.style.left = 0 + "px";
  canvas.style.width = "100vw";
  canvas.style.height = "100vh";
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
  document.body.appendChild(canvas);
  const rect = element.getBoundingClientRect();
  const height = Math.floor(rect.height / 2.2);
  const [startX, startY] = [rect.left + rect.width / 2, rect.top + rect.height / 2];

  const ctx = canvas.getContext("2d", { alpha: true })!;

  const abort = new AbortController();
  canvas.addEventListener("mouseup", () => {
    document.body.removeChild(canvas);
    abort.abort();
  }, { once: true });
  canvas.addEventListener("mousemove", (evt) => {
    let [endX, endY] = [
      lock.x ? startX : evt.clientX,
      lock.y ? startY : evt.clientY,
    ];
    // clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    // draw line from start to current mouse position
    ctx.beginPath();
    ctx.moveTo(startX, startY);
    ctx.lineTo(endX, endY);
    ctx.strokeStyle = "#ffffffa0";
    ctx.lineWidth = 4;
    ctx.stroke();
    // draw circle
    ctx.beginPath();
    ctx.arc(endX, endY, height, 0, 2 * Math.PI);
    ctx.fillStyle = "#ffffffa0";
    ctx.fill();
    callback(toMouseMoveData(startX, startY, endX, endY));
  }, { signal: abort.signal });
}

function toMouseMoveData(startX: number, startY: number, endX: number, endY: number): MouseMoveData {
  const distance = Math.sqrt(Math.pow(endX - startX, 2) + Math.pow(endY - startY, 2));
  const direction = (1 << (startY > endY ? 3 : 2)) | (1 << (startX > endX ? 1 : 0));
  return { start: { x: startX, y: startY }, end: { x: endX, y: endY }, distance, direction };
}

