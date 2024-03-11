export default function onMouse(ele: HTMLProgressElement, callback: (percent: number) => void) {
  ele.addEventListener("mousedown", (event) => {
    const { left } = ele.getBoundingClientRect();
    const mouseMove = (event: MouseEvent) => {
      const xInProgress = event.clientX - left;
      const percent = Math.round(xInProgress / ele.clientWidth * 100);
      callback(percent);
    }
    mouseMove(event);
    ele.addEventListener("mousemove", mouseMove);
    ele.addEventListener("mouseup", () => {
      ele.removeEventListener("mousemove", mouseMove);
    }, { once: true });
    ele.addEventListener("mouseleave", () => {
      ele.removeEventListener("mousemove", mouseMove);
    }, { once: true });
  });
}
