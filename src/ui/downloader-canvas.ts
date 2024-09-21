import { CherryPick } from "../download/downloader";
import EBUS from "../event-bus";
import { IMGFetcherQueue } from "../fetcher-queue";
import { FetchState, IMGFetcher } from "../img-fetcher";
import { Debouncer } from "../utils/debouncer";

type DrawNode = {
  index: number;
  x: number;
  y: number;
  selected: boolean;
  disabled: boolean;
};

export class DownloaderCanvas {
  canvas: HTMLCanvasElement;
  mousemoveState: { x: number; y: number };
  ctx: CanvasRenderingContext2D;
  queue: IMGFetcherQueue;
  rectSize: number;
  rectGap: number;
  columns: number;
  padding: number;
  scrollTop: number;
  scrollSize: number;
  debouncer: Debouncer;
  onClick?: (index: number) => void;
  cherryPick: () => CherryPick;
  constructor(canvas: HTMLCanvasElement, queue: IMGFetcherQueue, cherryPick: () => CherryPick) {
    this.queue = queue;
    this.cherryPick = cherryPick;
    if (!canvas) {
      throw new Error("canvas not found");
    }
    this.canvas = canvas;
    this.canvas.addEventListener("wheel", (event) =>
      this.onwheel(event.deltaY)
    );
    this.mousemoveState = { x: 0, y: 0 };
    this.canvas.addEventListener("mousemove", (event) => {
      this.mousemoveState = { x: event.offsetX, y: event.offsetY };
      this.drawDebouce();
    });
    this.canvas.addEventListener("click", (event) => {
      this.mousemoveState = { x: event.offsetX, y: event.offsetY };
      const index = this.computeDrawList()?.find(
        (state) => state.selected
      )?.index;
      if (index !== undefined) {
        EBUS.emit("downloader-canvas-on-click", index)
      }
    });
    this.ctx = this.canvas.getContext("2d")!;
    this.rectSize = 12; // 矩形大小(正方形)
    this.rectGap = 6; // 矩形之间间隔
    this.columns = 15; // 每行矩形数量 will change with parent resize
    this.padding = 7; // 画布内边距
    this.scrollTop = 0; // 滚动位置
    this.scrollSize = 10; // 每次滚动粒度
    this.debouncer = new Debouncer();

    // register animation event to parent for size change
    EBUS.subscribe("imf-download-state-change", () => this.drawDebouce());
    EBUS.subscribe("downloader-canvas-resize", () => this.resize());
  }

  private resize(parent?: HTMLElement) {
    parent = parent || (this.canvas.parentElement as HTMLElement);
    this.canvas.width = Math.floor(parent.offsetWidth);
    this.canvas.height = Math.floor(parent.offsetHeight);
    this.columns = Math.ceil((this.canvas.width - this.padding * 2 - this.rectGap) / (this.rectSize + this.rectGap));
    this.draw();
  }

  onwheel(deltaY: number) {
    const [_, h] = this.getWH();
    const clientHeight = this.computeClientHeight();
    if (clientHeight > h) {
      deltaY = deltaY >> 1;
      this.scrollTop += deltaY;
      if (this.scrollTop < 0) this.scrollTop = 0;
      if (this.scrollTop + h > clientHeight + 20)
        this.scrollTop = clientHeight - h + 20;
      this.draw();
    }
  }

  drawDebouce() {
    this.debouncer.addEvent("DOWNLOADER-DRAW", () => this.draw(), 20);
  }

  computeDrawList(): DrawNode[] {
    const list: DrawNode[] = [];
    const picked = this.cherryPick();
    const [_, h] = this.getWH();
    const startX = this.computeStartX();
    const startY = -this.scrollTop + this.padding;
    for (let i = 0, row = -1; i < this.queue.length; i++) {
      const currCol = i % this.columns;
      if (currCol == 0) {
        row++;
      }
      const atX = startX + (this.rectSize + this.rectGap) * currCol;
      const atY = startY + (this.rectSize + this.rectGap) * row;
      if (atY + this.rectSize < 0) {
        continue;
      }
      if (atY > h) {
        break;
      }
      list.push({
        index: i,
        x: atX,
        y: atY,
        selected: this.isSelected(atX, atY),
        disabled: !picked.picked(i)
      });
    }
    return list;
  }

  // this function should be called by drawDebouce
  private draw() {
    const [w, h] = this.getWH();
    this.ctx.clearRect(0, 0, w, h);
    const drawList = this.computeDrawList();
    for (const node of drawList) {
      this.drawSmallRect(
        node.x,
        node.y,
        this.queue[node.index],
        node.index === this.queue.currIndex,
        node.selected,
        node.disabled
      );
    }
  }

  computeClientHeight() {
    return (
      Math.ceil(this.queue.length / this.columns) *
      (this.rectSize + this.rectGap) -
      this.rectGap
    );
  }

  scrollTo(index: number) {
    const clientHeight = this.computeClientHeight();
    const [_, h] = this.getWH();
    if (clientHeight <= h) {
      return;
    }

    // compute offsetY of index in list
    const rowNo = Math.ceil((index + 1) / this.columns);
    const offsetY = (rowNo - 1) * (this.rectSize + this.rectGap);

    if (offsetY > h) {
      this.scrollTop = offsetY + this.rectSize - h;
      const maxScrollTop = clientHeight - h + 20;
      if (this.scrollTop + 20 <= maxScrollTop) {
        this.scrollTop += 20; // todo what?
      }
    }
  }

  isSelected(atX: number, atY: number): boolean {
    return (
      this.mousemoveState.x - atX >= 0 &&
      this.mousemoveState.x - atX <= this.rectSize &&
      this.mousemoveState.y - atY >= 0 &&
      this.mousemoveState.y - atY <= this.rectSize
    );
  }

  computeStartX(): number {
    const [w, _] = this.getWH();
    const drawW = (this.rectSize + this.rectGap) * this.columns - this.rectGap;
    const startX = (w - drawW) >> 1;
    return startX;
  }

  drawSmallRect(
    x: number,
    y: number,
    imgFetcher: IMGFetcher,
    isCurr: boolean,
    isSelected: boolean,
    disabled: boolean
  ) {
    if (disabled) {
      this.ctx.fillStyle = "rgba(20, 20, 20, 1)";
    } else {
      switch (imgFetcher.stage) {
        case FetchState.FAILED:
          this.ctx.fillStyle = "rgba(250, 50, 20, 0.9)";
          break;
        case FetchState.URL:
          this.ctx.fillStyle = "rgba(200, 200, 200, 0.6)";
          break;
        case FetchState.DATA:
          const percent =
            imgFetcher.downloadState.loaded / imgFetcher.downloadState.total;
          this.ctx.fillStyle = `rgba(${200 + Math.ceil((110 - 200) * percent)}, ${200 + Math.ceil((200 - 200) * percent)}, ${200 + Math.ceil((120 - 200) * percent)}, ${0.6 + Math.ceil((1 - 0.6) * percent)})`;
          break;
        case FetchState.DONE:
          this.ctx.fillStyle = "rgb(110, 200, 120)";
          break;
      }
    }
    this.ctx.fillRect(x, y, this.rectSize, this.rectSize);
    this.ctx.shadowColor = "#d53";
    if (isSelected) {
      this.ctx.strokeStyle = "rgb(60, 20, 200)";
      this.ctx.lineWidth = 2;
    } else if (isCurr) {
      this.ctx.strokeStyle = "rgb(255, 60, 20)";
      this.ctx.lineWidth = 2;
    } else {
      this.ctx.strokeStyle = "rgb(90, 90, 90)";
      this.ctx.lineWidth = 1;
    }
    this.ctx.strokeRect(x, y, this.rectSize, this.rectSize);
  }

  getWH() {
    return [this.canvas.width, this.canvas.height];
  }
}
