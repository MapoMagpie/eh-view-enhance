import { conf } from "../config";
import EBUS from "../event-bus";
import { IMGFetcherQueue } from "../fetcher-queue";
import { VisualNode } from "../img-node";
import { evLog } from "../utils/ev-log";
import { Elements } from "./html";

export class FullViewGridManager {
  root: HTMLElement;
  queue: IMGFetcherQueue;
  renderRangeRecord: [number, number] = [0, 0];
  constructor(HTML: Elements, queue: IMGFetcherQueue) {
    this.root = HTML.fullViewGrid;
    this.queue = queue;
    EBUS.subscribe("pf-on-appended", (_total, nodes) => {
      if (nodes.length > 0) {
        this.appendToView(nodes);
      }
    });
    EBUS.subscribe("pf-change-chapter", () => {
      this.root.innerHTML = "";
    });
  }

  appendToView(nodes: VisualNode[]) {
    this.root.append(...nodes.map(node => node.create()));
  }

  tryExtend() {
    // find the last image node if overflow (screen height * 3.5), then append next page
    const lastImgNode = this.queue[this.queue.length - 1].node.root!;
    const viewButtom = this.root.scrollTop + this.root.clientHeight;
    if (viewButtom + (this.root.clientHeight * 2.5) < lastImgNode.offsetTop + lastImgNode.offsetHeight) {
      return;
    }
    EBUS.emit("fvgm-want-extend");
  }

  /**
   *  当滚动停止时，检查当前显示的页面上的是什么元素，然后渲染图片
   */
  renderCurrView() {
    const [scrollTop, clientHeight] = [this.root.scrollTop, this.root.clientHeight];
    const [start, end] = this.findOutsideRoundView(scrollTop, clientHeight);
    // slice will triggered IMGFetcherQueue's constructor()
    this.queue.slice(start, end + 1 + conf.colCount).forEach((imgFetcher) => imgFetcher.render());
    if (this.queue.dataSize >= 1000000000) {
      const unrenders = findNotInNewRange(this.renderRangeRecord, [start, end]);
      unrenders.forEach(([start, end]) => this.queue.slice(start, end + 1).forEach((imgFetcher) => imgFetcher.unrender()));
      evLog("debug", `range of render:${start + 1}-${end + 1}, old range is:${this.renderRangeRecord[0] + 1}-${this.renderRangeRecord[1] + 1}, range of unrender:${unrenders.map(([start, end]) => `${start + 1}-${end + 1}`).join(",")}`);
    }
    this.renderRangeRecord = [start, end];
  }

  findOutsideRoundView(currTop: number, clientHeight: number): [number, number] {
    const viewButtom = currTop + clientHeight;
    let outsideTop: number = 0;
    let outsideBottom: number = 0;
    for (let i = 0; i < this.queue.length; i += conf.colCount) {
      const { root } = this.queue[i].node;
      if (!root) continue;
      // 查询最靠近当前视图上边的缩略图索引
      // 缩略图在父元素的位置 - 当前视图上边位置 = 缩略图与当前视图上边的距离，如果距离 >= 0，说明缩略图在当前视图内
      if (outsideBottom === 0) {
        if (root.offsetTop + 2 >= currTop) { // +2 for deviation
          outsideBottom = i + 1; // +1 for skip current condition
        } else {
          outsideTop = i;
        }
      } else {
        outsideBottom = i;
        if (root.offsetTop + root.offsetHeight > viewButtom) {
          break;
        }
      }
    }
    return [outsideTop, Math.min(outsideBottom + conf.colCount, this.queue.length - 1)];
  }
}

function findNotInNewRange(old: number[], neo: number[]): number[][] {
  const ret: number[][] = [];
  if (neo[0] > old[0]) {
    ret.push([old[0], neo[0] - 1]);
  }

  if (neo[1] < old[1]) {
    ret.push([neo[1] + 1, old[1]]);
  }

  if (ret.length === 2) {
    if (ret[1][0] < ret[0][1]) {
      ret[1][0] = ret[0][1];
      ret.shift();
    }
    if (ret[0][1] > ret[1][0]) {
      ret[0][1] = ret[1][0];
      ret.pop();
    }
  }
  return ret;
}
