import { conf } from "../config";
import EBUS from "../event-bus";
import ImageNode from "../img-node";
import { Debouncer } from "../utils/debouncer";
import queryCSSRules from "../utils/query-cssrules";
import { evLog } from "../utils/ev-log";
import { Elements } from "./html";
import { BigImageFrameManager } from "./big-image-frame-manager";
import { IMGFetcher } from "../img-fetcher";

type E = {
  node: IMGFetcher,
  element: HTMLElement
  ratio: number;
}
abstract class Layout {
  abstract append(nodes: E[]): void;
  abstract nearBottom(): boolean;
  abstract reset(): void;
  abstract resize(allNodes: E[]): void;
  abstract resizedNode(node: HTMLElement, pending: HTMLElement[]): number[];
  abstract visibleRange(container: HTMLElement, children: HTMLElement[]): [HTMLElement, HTMLElement];
}

export class FullViewGridManager {
  root: HTMLElement;
  queue: E[] = [];
  done: boolean = false;
  chapterIndex: number = 0;
  layout: Layout;
  resizedNodesPending: HTMLElement[] = [];
  debouncer: Debouncer;
  constructor(HTML: Elements, BIFM: BigImageFrameManager, flowVision: boolean = false) {
    this.root = HTML.fullViewGrid;
    this.debouncer = new Debouncer();
    if (flowVision) {
      this.layout = new FlowVisionLayout(this.root);
    } else {
      this.layout = new GRIDLayout(this.root, HTML.styleSheet);
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
    this.root.addEventListener("scroll", () => this.debouncer.addEvent("FULL-VIEW-SCROLL-EVENT", () => {
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
    EBUS.subscribe("fvg-flow-vision-resize", () => this.layout.resize(this.queue));
    EBUS.subscribe("imn-resize", (node) => this.resizedNodes(node));
  }
  resizedNodes(node: ImageNode) {
    if (node.root) {
      this.resizedNodesPending.push(node.root);
    }
    this.debouncer.addEvent("RESIZED-NODES", () => {
      if (this.resizedNodesPending.length === 0) return;
      let node = null;
      while (node = this.resizedNodesPending.shift()) {
        const remove = this.layout.resizedNode(node, this.resizedNodesPending);
        this.resizedNodesPending = this.resizedNodesPending.filter((_, i) => !remove.includes(i));
      }
    }, 50);
  }
  append(nodes: IMGFetcher[]) {
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
  style: CSSStyleSheet
  constructor(root: HTMLElement, style: CSSStyleSheet) {
    super();
    this.root = root;
    this.style = style;
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
  resize(): void {
    const rule = queryCSSRules(this.style, ".fvg-grid");
    if (rule) rule.style.gridTemplateColumns = `repeat(${conf.colCount}, minmax(10px, 1fr))`;
  }
  resizedNode(_node: HTMLElement, pending: HTMLElement[]): number[] {
    return pending.map((_, i) => i);
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
  resizeObserver: ResizeObserver;
  lastRootWidth: number;
  // baseline
  base: { height: number, columns: number, gap: number };
  constructor(root: HTMLElement) {
    super();
    this.root = root;
    this.root.classList.add("fvg-flow");
    this.root.classList.remove("fvg-grid");
    this.lastRootWidth = this.root.offsetWidth;
    this.base = this.initBaseline();
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
  initBaseline() {
    return { height: conf.rowHeight, columns: conf.colCount, gap: 8, };
  }
  createRow(lastRowHeight?: number): HTMLElement {
    const container = document.createElement("div");
    container.classList.add("fvg-sub-container");
    container.style.height = (lastRowHeight ?? this.base.height) + "px";
    container.style.marginTop = this.base.gap + "px";
    this.root.appendChild(container);
    return container;
  }
  append(nodes: E[]): void {
    for (const node of nodes) {
      node.element.style.marginLeft = this.base.gap + "px";
      if (!this.lastRow) this.lastRow = this.createRow();
      if (this.checkRowFilled(this.lastRow, node.ratio)) {
        this.resizeRow(this.lastRow);
        this.lastRow = this.createRow(this.lastRow?.offsetHeight);
      }
      this.lastRow.appendChild(node.element);
      this.count++;
    }
  }
  checkRowFilled(row: HTMLElement, newNodeRatio: number) {
    if (row.childElementCount === 0) return false;
    // max columns
    let filled = row.childElementCount >= this.base.columns;
    // check total width
    if (!filled) {
      let nodeWidth = this.base.height * newNodeRatio;
      const allGap = (row.childElementCount * this.base.gap) + this.base.gap;
      const factor = 0.4 / Math.max(1, newNodeRatio); // If the ratio (w/h) is greater than 1, then set its height smaller.
      nodeWidth = nodeWidth * factor;
      const childrenWidth = this.childrenRatio(row).reduce((width, curr) => width + (curr * this.base.height), 0);
      filled = childrenWidth + allGap + nodeWidth >= this.root.offsetWidth;
    }
    return filled;
  }
  childrenRatio(row: HTMLElement): number[] {
    const ret: number[] = [];
    const ratio = (c: HTMLElement) => {
      let ratio = parseFloat(c.getAttribute("data-ratio") ?? "1")
      ratio = isNaN(ratio) ? 1 : ratio;
      return ratio;
    }
    row.childNodes.forEach(c => ret.push(ratio(c as HTMLElement)));
    return ret;
  }
  resizeRow(row: HTMLElement) {
    const ratio = this.childrenRatio(row).reduce((sum, cur) => sum + cur, 0);
    const allGap = row.childElementCount * this.base.gap + this.base.gap;
    const vw = this.root.offsetWidth;
    const rowHeight = (vw - allGap) / ratio;
    row.style.height = rowHeight + "px";
  }
  resize(allNodes: E[]) {
    this.base = this.initBaseline();
    this.root.innerHTML = "";
    this.lastRow = undefined;
    this.append(allNodes);
  }
  resizedNode(node: HTMLElement, pending: HTMLElement[]): number[] {
    let row = node.parentElement as HTMLElement | null;
    if (!row) return [];
    const fragment = document.createDocumentFragment();
    let children: HTMLElement[] = [];
    function* next(): Generator<HTMLElement> {
      fragment.append(...children); // if chindren remain elements, move to fragment first, then check row children
      if (row!.childElementCount > 0) {
        const newChildren = Array.from(row!.childNodes).map(child => child as HTMLElement);
        fragment.append(...newChildren);
        children.push(...newChildren);
      }
      let child = null;
      while (child = children.shift()) {
        yield child;
      }
      const nextRow = row?.nextElementSibling as HTMLElement | null;
      if (nextRow) {
        children = Array.from(nextRow.childNodes).map(child => child as HTMLElement);
        while (child = children.shift()) {
          yield child;
        }
      }
    }
    let remove = [];
    let movedImgNode = 0, changedRows = 1;
    while (true) {
      for (const child of next()) {
        const ratio = parseFloat(child.getAttribute("data-ratio") ?? "1");
        if (this.checkRowFilled(row, ratio)) {
          children.unshift(child);
          this.resizeRow(row);
          break;
        }
        const index = pending.indexOf(child);
        if (index >= 0) remove.push(index);
        movedImgNode++;
        row.appendChild(child);
      }
      row = row?.nextElementSibling as HTMLElement | null; // next row
      if (row === null) {
        row = this.createRow();
      }
      if (children.length === 0) {
        if (row.childElementCount === 0) row.remove();
        break;
      }
      if (children.length === row.childElementCount && children[0] === row.firstElementChild) {
        break;
      }
      changedRows++;
    }
    evLog("info", `resizedNode moved img-nodes [${movedImgNode}], changed rows [${changedRows}], resized [${remove.length}]`);
    return remove;
  }
  nearBottom(): boolean {
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
