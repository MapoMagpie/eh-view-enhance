export function dragElement(element: HTMLElement, dragHub?: HTMLElement, callback?: (offsetTop: number, offsetLeft: number) => void) {
  let mouseX = 0, mouseY = 0;
  (dragHub ?? element).addEventListener("mousedown", (event) => {
    event.preventDefault();
    mouseX = event.clientX;
    mouseY = event.clientY;
    const wh = window.innerHeight;
    const ww = window.innerWidth;
    const mouseMove = (event: MouseEvent) => {
      event.preventDefault();
      const newTop = element.offsetTop - (mouseY - event.clientY);
      const newLeft = element.offsetLeft - (mouseX - event.clientX);
      mouseX = event.clientX;
      mouseY = event.clientY;
      if (newTop <= wh / 2) {
        element.style.top = newTop + "px";
        element.style.bottom = "unset";
      } else {
        element.style.bottom = (wh - newTop - element.clientHeight) + "px";
        element.style.top = "unset";
      }
      if (newLeft <= ww / 2) {
        element.style.left = newLeft + "px";
        element.style.right = "unset";
      } else {
        element.style.right = (ww - newLeft - element.clientWidth) + "px";
        element.style.left = "unset";
      }
    }
    document.addEventListener("mousemove", mouseMove);
    document.addEventListener("mouseup", () => {
      document.removeEventListener("mousemove", mouseMove);
      callback && callback(element.offsetTop, element.offsetLeft);
    }, { once: true });
  });

}
