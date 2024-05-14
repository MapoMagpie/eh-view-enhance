export function dragElement(element: HTMLElement, dragHub?: HTMLElement, callback?: (offsetTop: number, offsetLeft: number) => void) {
  (dragHub ?? element).addEventListener("mousedown", (event) => {
    event.preventDefault();
    const wh = window.innerHeight;
    const ww = window.innerWidth;
    const mouseMove = (event: MouseEvent) => {
      event.preventDefault();
      const mouseX = event.clientX;
      const mouseY = event.clientY;
      if (mouseY <= wh / 2) {
        element.style.top = Math.max(mouseY, 5) + "px";
        element.style.bottom = "unset";
      } else {
        element.style.bottom = Math.max(wh - mouseY - element.clientHeight, 5) + "px";
        element.style.top = "unset";
      }
      if (mouseX <= ww / 2) {
        element.style.left = Math.max(mouseX, 5) + "px";
        element.style.right = "unset";
      } else {
        element.style.right = Math.max(ww - mouseX - element.clientWidth, 5) + "px";
        element.style.left = "unset";
      }
      console.log("drag element: offset top: ", element.style.top, "offset left: ", element.style.left, "offset bottom: ", element.style.bottom, "offset right: ", element.style.right);
    }
    document.addEventListener("mousemove", mouseMove);
    document.addEventListener("mouseup", () => {
      document.removeEventListener("mousemove", mouseMove);
      callback?.(element.offsetTop, element.offsetLeft);
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

