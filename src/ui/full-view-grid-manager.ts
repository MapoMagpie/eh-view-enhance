import { conf } from "../config";
import EBUS from "../event-bus";
import { VisualNode } from "../img-node";
import { Debouncer } from "../utils/debouncer";
import { evLog } from "../utils/ev-log";
import { Elements } from "./html";
import { BigImageFrameManager } from "./ultra-image-frame-manager";

type E = {
  node: VisualNode,
  element: HTMLElement
  ratio?: number;
}
abstract class Layout {
  abstract append(nodes: E[]): void;
  abstract nearBottom(): boolean;
  abstract reset(): void;
  abstract visibleRange(container: HTMLElement, children: HTMLElement[]): [HTMLElement, HTMLElement];
}

export class FullViewGridManager {
  root: HTMLElement;
  queue: E[] = [];
  done: boolean = false;
  chapterIndex: number = 0;
  layout: Layout;
  constructor(HTML: Elements, BIFM: BigImageFrameManager, flowVision: boolean = false) {
    this.root = HTML.fullViewGrid;
    if (flowVision) {
      this.layout = new FlowVisionLayout(this.root);
    } else {
      this.layout = new GRIDLayout(this.root);
    }
    EBUS.subscribe("pf-on-appended", (_total, nodes, chapterIndex, done) => {
      if (this.chapterIndex > -1 && chapterIndex !== this.chapterIndex) return;
      this.append(nodes);
      this.done = done || false;
      setTimeout(() => this.renderCurrView(), 200);
    });
    EBUS.subscribe("pf-change-chapter", (index) => {
      this.chapterIndex = index;
      this.layout.reset();
      this.queue = [];
      this.done = false;
    });
    // scroll to the element that is in full view grid
    EBUS.subscribe("ifq-do", (_, imf) => {
      if (!BIFM.visible) return;
      if (imf.chapterIndex !== this.chapterIndex) return;
      if (!imf.node.root) return;
      let scrollTo = 0;
      if (flowVision) {
        scrollTo = imf.node.root.parentElement!.offsetTop - window.screen.availHeight / 3;
      } else {
        scrollTo = imf.node.root.offsetTop - window.screen.availHeight / 3;
      }
      scrollTo = scrollTo <= 0 ? 0 : scrollTo >= this.root.scrollHeight ? this.root.scrollHeight : scrollTo;
      if (this.root.scrollTo.toString().includes("[native code]")) {
        this.root.scrollTo({ top: scrollTo, behavior: "smooth" });
      } else {
        this.root.scrollTop = scrollTo;
      }
    });
    EBUS.subscribe("cherry-pick-changed", (chapterIndex) => this.chapterIndex === chapterIndex && this.updateRender());
    const debouncer = new Debouncer();
    this.root.addEventListener("scroll", () => debouncer.addEvent("FULL-VIEW-SCROLL-EVENT", () => {
      if (HTML.root.classList.contains("ehvp-root-collapse")) return;
      this.renderCurrView();
      this.tryExtend();
    }, 400));
    this.root.addEventListener("click", (event) => {
      if (event.target === HTML.fullViewGrid
        || (event.target as HTMLElement).classList.contains("img-node")
        || (event.target as HTMLElement).classList.contains("fvg-sub-container")
      ) {
        EBUS.emit("toggle-main-view", false);
      }
    });
  }
  append(nodes: VisualNode[]) {
    if (nodes.length > 0) {
      let index = this.queue.length;
      const list = nodes.map(n => {
        const ret = { node: n, element: n.create(), ratio: n.ratio() };
        ret.element.setAttribute("data-index", index.toString());
        index++;
        return ret;
      });
      this.queue.push(...list);
      this.layout.append(list);
    }
  }
  tryExtend() {
    if (this.done) return;
    if (this.layout.nearBottom()) EBUS.emit("pf-try-extend");
  }
  updateRender() {
    this.queue.forEach(({ node }) => node.isRender() && node.render());
  }
  renderCurrView() {
    const [se, ee] = this.layout.visibleRange(this.root, this.queue.map(e => e.element));
    const [start, end] = [parseInt(se.getAttribute("data-index") ?? "-1"), parseInt(ee.getAttribute("data-index") ?? "-1")];
    if (start < end && start > -1 && end < this.queue.length) {
      this.queue.slice(start, end + 1).forEach(e => e.node.render());
      evLog("info", "render curr view, range: ", `[${start}-${end}]`);
    } else {
      evLog("error", "render curr view error, range: ", `[${start}-${end}]`);
    }
  }
}

class GRIDLayout extends Layout {
  root: HTMLElement;
  constructor(root: HTMLElement) {
    super();
    this.root = root;
    this.root.classList.add("fvg-grid");
    this.root.classList.remove("fvg-flow");
  }
  append(nodes: E[]): void {
    this.root.append(...nodes.map(l => l.element));
  }
  nearBottom(): boolean {
    // find the last node in this.root;
    const nodes = Array.from(this.root.childNodes);
    if (nodes.length === 0) return false;
    const lastImgNode = nodes[nodes.length - 1] as HTMLElement;
    const viewButtom = this.root.scrollTop + this.root.clientHeight;
    if (viewButtom + (this.root.clientHeight * 2.5) < lastImgNode.offsetTop + lastImgNode.offsetHeight) {
      return false;
    }
    return true;
  }
  reset(): void {
    this.root.innerHTML = "";
  }
  visibleRange(container: HTMLElement, children: HTMLElement[]): [HTMLElement, HTMLElement] {
    if (children.length === 0) return [container, container]; // throw error
    const vh = container.offsetHeight;
    let first: HTMLElement | undefined;
    let last: HTMLElement | undefined;
    let overRow = 0;
    for (let i = 0; i < children.length; i += conf.colCount) {
      const rect = children[i].getBoundingClientRect();
      const visible = rect.top + rect.height >= 0 && rect.top <= vh;
      if (visible) {
        if (first === undefined) {
          first = children[i];
        }
      }
      if (first && !visible) {
        overRow++;
      }
      if (overRow >= 2) {
        last = children[Math.min(children.length - 1, i + conf.colCount)];
        break;
      }
    }
    last = last ?? children[children.length - 1];
    return [first ?? last, last];
  }
}

class FlowVisionLayout extends Layout {
  root: HTMLElement;
  lastRow?: HTMLElement;
  count: number = 0;
  defaultHeight: number;
  resizeObserver: ResizeObserver;
  lastRootWidth: number;
  constructor(root: HTMLElement) {
    super();
    this.root = root;
    this.root.classList.add("fvg-flow");
    this.root.classList.remove("fvg-grid");
    this.defaultHeight = window.screen.availHeight / 3;
    this.lastRootWidth = this.root.offsetWidth;
    this.resizeObserver = new ResizeObserver((entries) => {
      const root = entries[0];
      const width = root.contentRect.width;
      if (this.lastRootWidth !== width) {
        this.lastRootWidth = width;
        Array.from(root.target.querySelectorAll<HTMLElement>(".fvg-sub-container")).forEach(row => this.resizeRow(row));
      }
    });
    this.resizeObserver.observe(this.root);
  }
  createRow(_columns: number): HTMLElement {
    const container = document.createElement("div");
    container.classList.add("fvg-sub-container");
    container.style.height = this.defaultHeight + "px";
    container.style.marginTop = "10px";
    this.root.appendChild(container);
    return container;
  }
  append(nodes: E[]): void {
    for (const node of nodes) {
      node.element.style.marginLeft = "10px";
      if (!this.lastRow) this.lastRow = this.createRow(conf.colCount);
      const lastChild = this.lastRow.lastElementChild as HTMLElement | null;
      if (lastChild) {
        const nodeWidth = this.lastRow.offsetHeight * (node.ratio ?? 1);
        const gap = (this.lastRow.childElementCount + 1) * 10;
        const factor = 0.5 / Math.max(1, node.ratio ?? 1);
        if (this.lastRow.childElementCount >= 6
          || this.childrenWidth(this.lastRow) + gap + (nodeWidth * factor) > this.root.offsetWidth) {
          if (this.resizeRow(this.lastRow, nodeWidth)) {
            this.lastRow = this.createRow(conf.colCount);
          }
        }
      }
      this.lastRow.appendChild(node.element);
      this.count++;
    }
  }
  childrenWidth(row: HTMLElement): number {
    let width = 0;
    row.childNodes.forEach(c => width += (c as HTMLElement).offsetWidth);
    return width;
  }
  childrenRatio(row: HTMLElement): number[] {
    const ret: number[] = [];
    row.childNodes.forEach(c => ret.push((c as HTMLElement).offsetWidth / (c as HTMLElement).offsetHeight));
    return ret;
  }
  resizeRow(row: HTMLElement, _nextChildWidth?: number): boolean {
    if (row.childElementCount < 4) return false;

    const ratios = this.childrenRatio(row).filter(r => r >= 1);
    if (ratios.length === row.childElementCount && row.childElementCount < 5) return false;

    const gap = (row.childElementCount + 1) * 10;
    const width = this.childrenWidth(row) + gap;
    const scale = width / this.root.offsetWidth;
    row.style.height = (row.offsetHeight / scale) + "px";
    row.childNodes.forEach(c => (c as HTMLElement).style.marginLeft = "");
    row.style.justifyContent = "space-around";
    return true;
  }
  nearBottom(): boolean {
    // return false;
    // find the last node in this.root;
    const last = this.lastRow;
    if (!last) return false;
    const viewButtom = this.root.scrollTop + this.root.clientHeight;
    if (viewButtom + (this.root.clientHeight * 2.5) < last.offsetTop + last.offsetHeight) {
      return false;
    }
    return true;
  }
  reset(): void {
    this.root.innerHTML = "";
  }
  visibleRange(): [HTMLElement, HTMLElement] {
    const children = Array.from(this.root.querySelectorAll<HTMLElement>(".fvg-sub-container"));
    if (children.length === 0) return [this.root, this.root]; // throw error
    const vh = this.root.offsetHeight;
    let first: HTMLElement | undefined;
    let last: HTMLElement | undefined;
    let overRow = 0;
    for (let i = 0; i < children.length; i++) {
      const rect = children[i].getBoundingClientRect();
      const visible = rect.top + rect.height >= 0 && rect.top <= vh;
      if (visible) {
        if (first === undefined) {
          first = children[i].firstElementChild as HTMLElement;
        }
      }
      if (first && !visible) {
        overRow++;
      }
      if (overRow >= 2) {
        last = children[i].lastElementChild as HTMLElement;
        break;
      }
    }
    last = last ?? children[children.length - 1].lastElementChild as HTMLElement;
    return [first ?? last, last];
  }
}
