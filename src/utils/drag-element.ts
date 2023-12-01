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
        element.style.top = Math.max(mouseY, 500) + "px";
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
