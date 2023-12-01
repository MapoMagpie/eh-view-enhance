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
        element.style.top = Math.max(newTop, 500) + "px";
        element.style.bottom = "unset";
      } else {
        element.style.bottom = Math.max(wh - newTop - element.clientHeight, 5) + "px";
        element.style.top = "unset";
      }
      if (newLeft <= ww / 2) {
        element.style.left = Math.max(newLeft, 5) + "px";
        element.style.right = "unset";
      } else {
        element.style.right = Math.max(ww - newLeft - element.clientWidth, 5) + "px";
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
