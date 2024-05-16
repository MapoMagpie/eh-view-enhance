import { conf } from "../config";
import EBUS from "../event-bus";
import { VisualNode } from "../img-node";
import { Elements } from "./html";
import { BigImageFrameManager } from "./ultra-image-frame-manager";

type E = {
  node: VisualNode,
  element: HTMLElement
}
export class FullViewGridManager {
  root: HTMLElement;
  // renderRangeRecord: [number, number] = [0, 0];
  queue: E[] = [];
  done: boolean = false;
  chapterIndex: number = 0;
  constructor(HTML: Elements, BIFM: BigImageFrameManager) {
    this.root = HTML.fullViewGrid;
    EBUS.subscribe("pf-on-appended", (_total, nodes, chapterIndex, done) => {
      if (chapterIndex !== this.chapterIndex) return;
      this.append(nodes);
      this.done = done || false;
      setTimeout(() => this.renderCurrView(), 200);
    });
    EBUS.subscribe("pf-change-chapter", (index) => {
      this.chapterIndex = Math.max(0, index);
      this.root.innerHTML = "";
      this.queue = [];
      this.done = false;
    });
    // scroll to the element that is in full view grid
    EBUS.subscribe("ifq-do", (_, imf) => {
      if (!BIFM.visible) return;
      if (imf.chapterIndex !== this.chapterIndex) return;
      if (!imf.node.root) return;
      let scrollTo = imf.node.root.offsetTop - window.screen.availHeight / 3;
      scrollTo = scrollTo <= 0 ? 0 : scrollTo >= this.root.scrollHeight ? this.root.scrollHeight : scrollTo;
      if (this.root.scrollTo.toString().includes("[native code]")) {
        this.root.scrollTo({ top: scrollTo, behavior: "smooth" });
      } else {
        this.root.scrollTop = scrollTo;
      }
    });
  }

  append(nodes: VisualNode[]) {
    if (nodes.length > 0) {
      const list = nodes.map(n => {
        return {
          node: n, element: n.create()
        }
      });
      this.queue.push(...list);
      this.root.append(...list.map(l => l.element));
    }
  }

  tryExtend() {
    if (this.done) return;
    // find the last node in this.root;
    const nodes = Array.from(this.root.childNodes);
    if (nodes.length === 0) return;
    const lastImgNode = nodes[nodes.length - 1] as HTMLElement;
    const viewButtom = this.root.scrollTop + this.root.clientHeight;
    if (viewButtom + (this.root.clientHeight * 2.5) < lastImgNode.offsetTop + lastImgNode.offsetHeight) {
      return;
    }
    EBUS.emit("pf-try-extend");
  }

  /**
   *  当滚动停止时，检查当前显示的页面上的是什么元素，然后渲染图片
   */
  renderCurrView() {
    const [scrollTop, clientHeight] = [this.root.scrollTop, this.root.clientHeight];
    const [start, end] = this.findOutsideRoundView(scrollTop, clientHeight);
    this.queue.slice(start, end + 1 + conf.colCount).forEach((e) => e.node.render());
    // if (this.queue.dataSize >= 1000000000) {
    //   const unrenders = findNotInNewRange(this.renderRangeRecord, [start, end]);
    //   unrenders.forEach(([start, end]) => this.queue.slice(start, end + 1).forEach((imgFetcher) => imgFetcher.unrender()));
    //   evLog("debug", `range of render:${start + 1}-${end + 1}, old range is:${this.renderRangeRecord[0] + 1}-${this.renderRangeRecord[1] + 1}, range of unrender:${unrenders.map(([start, end]) => `${start + 1}-${end + 1}`).join(",")}`);
    // }
    // this.renderRangeRecord = [start, end];
  }

  findOutsideRoundView(currTop: number, clientHeight: number): [number, number] {
    const viewButtom = currTop + clientHeight;
    let outsideTop: number = 0;
    let outsideBottom: number = 0;
    for (let i = 0; i < this.queue.length; i += conf.colCount) {
      const element = this.queue[i].element;
      // 查询最靠近当前视图上边的缩略图索引
      // 缩略图在父元素的位置 - 当前视图上边位置 = 缩略图与当前视图上边的距离，如果距离 >= 0，说明缩略图在当前视图内
      if (outsideBottom === 0) {
        if (element.offsetTop + 2 >= currTop) { // +2 for deviation
          outsideBottom = i + 1; // +1 for skip current condition
        } else {
          outsideTop = i;
        }
      } else {
        outsideBottom = i;
        if (element.offsetTop + element.offsetHeight > viewButtom) {
          break;
        }
      }
    }
    return [outsideTop, Math.min(outsideBottom + conf.colCount, this.queue.length - 1)];
  }
}

// function findNotInNewRange(old: number[], neo: number[]): number[][] {
//   const ret: number[][] = [];
//   if (neo[0] > old[0]) {
//     ret.push([old[0], neo[0] - 1]);
//   }
//
//   if (neo[1] < old[1]) {
//     ret.push([neo[1] + 1, old[1]]);
//   }
//
//   if (ret.length === 2) {
//     if (ret[1][0] < ret[0][1]) {
//       ret[1][0] = ret[0][1];
//       ret.shift();
//     }
//     if (ret[0][1] > ret[1][0]) {
//       ret[0][1] = ret[1][0];
//       ret.pop();
//     }
//   }
//   return ret;
// }
