import { ConfigBooleanType, ConfigNumberType, ConfigSelectType, conf, saveConf, Oriented } from "../config";
import { IMGFetcherQueue } from "../fetcher-queue";
import { IdleLoader } from "../idle-loader";
import { PageFetcher } from "../page-fetcher";
import { i18n } from "../utils/i18n";
import parseKey from "../utils/keyboard";
import q from "../utils/query-element";
import createExcludeURLPanel from "./exclude-urls";
import { Elements } from "./html";
import createKeyboardCustomPanel from "./keyboard-custom";
import { PageHelper } from "./page-helper";
import { BigImageFrameManager } from "./ultra-image-frame-manager";

export type Events = ReturnType<typeof initEvents>;

export type KeyboardInBigImageModeId = "step-image-prev" | "step-image-next" | "exit-big-image-mode" | "step-to-first-image" | "step-to-last-image" | "scale-image-increase" | "scale-image-decrease" | "scroll-image-up" | "scroll-image-down";
export type KeyboardInFullViewGridId = "open-big-image-mode" | "pause-auto-load-temporarily" | "exit-full-view-grid" | "columns-increase" | "columns-decrease";
export type KeyboardInMainId = "open-full-view-grid";
export type KeyboardEvents = {
  inBigImageMode: Record<KeyboardInBigImageModeId, KeyboardDesc>,
  inFullViewGrid: Record<KeyboardInFullViewGridId, KeyboardDesc>,
  inMain: Record<KeyboardInMainId, KeyboardDesc>,
}
export class KeyboardDesc {
  defaultKeys: string[];
  cb: (event: KeyboardEvent) => void;
  noPreventDefault?: boolean = false;
  constructor(defaultKeys: string[], cb: (event: KeyboardEvent) => void, noPreventDefault?: boolean) {
    this.defaultKeys = defaultKeys;
    this.cb = cb;
    this.noPreventDefault = noPreventDefault || false;
  }
}

export function initEvents(HTML: Elements, BIFM: BigImageFrameManager, IFQ: IMGFetcherQueue, PF: PageFetcher, IL: IdleLoader, PH: PageHelper) {

  function modPageHelperPostion() {
    const style = HTML.pageHelper.style;
    conf.pageHelperAbTop = style.top;
    conf.pageHelperAbLeft = style.left;
    conf.pageHelperAbBottom = style.bottom;
    conf.pageHelperAbRight = style.right;
    saveConf(conf);
  }

  // modify config
  function modNumberConfigEvent(key: ConfigNumberType, data?: "add" | "minus") {
    const range = {
      colCount: [1, 12],
      threads: [1, 10],
      downloadThreads: [1, 10],
      timeout: [8, 40],
      autoPageInterval: [500, 90000],
      preventScrollPageTime: [0, 90000],
    };
    let mod = key === "autoPageInterval" ? 100 : 1;
    mod = key === "preventScrollPageTime" ? 10 : mod;
    if (data === "add") {
      if (conf[key] < range[key][1]) {
        conf[key] += mod;
      }
    } else if (data === "minus") {
      if (conf[key] > range[key][0]) {
        conf[key] -= mod;
      }
    }
    const inputElement = q<HTMLInputElement>(`#${key}Input`);
    if (inputElement) {
      inputElement.value = conf[key].toString();
    }
    if (key === "colCount") {
      const cssRules = Array.from(HTML.styleSheel.sheet?.cssRules || []);
      for (const cssRule of cssRules) {
        if (cssRule instanceof CSSStyleRule) {
          if (cssRule.selectorText === ".full-view-grid") {
            cssRule.style.gridTemplateColumns = `repeat(${conf[key]}, 1fr)`;
            break;
          }
        }
      }
    }
    saveConf(conf);
  }

  // modify config
  function modBooleanConfigEvent(key: ConfigBooleanType) {
    const inputElement = q<HTMLInputElement>(`#${key}Checkbox`);
    conf[key] = inputElement?.checked || false;
    saveConf(conf);
    if (key === "autoLoad") {
      IL.autoLoad = conf.autoLoad;
      if (IL.autoLoad) {
        IL.abort(IFQ.currIndex);
      }
    }
  }

  // modify config
  function modSelectConfigEvent(key: ConfigSelectType) {
    const inputElement = q<HTMLSelectElement>(`#${key}Select`);
    const value = inputElement?.value;
    if (value) {
      (conf[key] as any) = value;
      saveConf(conf);
    }
    if (key === "readMode") {
      BIFM.resetScaleBigImages();
      if (conf.readMode === "singlePage") {
        BIFM.init(BIFM.queue.currIndex);
      }
    }
    if (key === "minifyPageHelper") {
      switch (conf.minifyPageHelper) {
        case "inBigMode":
          PH.minify(true, BIFM.visible ? "bigImageFrame" : "fullViewGrid");
          break;
        case "always":
          PH.minify(true, "fullViewGrid");
          break;
        case "never":
          PH.minify(false, "fullViewGrid");
          break;
      }
    }
  }

  const cancelIDContext: Record<string, number> = {};
  function collapsePanelEvent(target: HTMLElement, id: string) {
    // FIX: in firefox, mouseleave event will be triggered when mouse move to child element, like <option>
    if (id) {
      abortMouseleavePanelEvent(id);
    }
    const timeoutId = window.setTimeout(() => target.classList.add("p-collapse"), 100);
    if (id) {
      cancelIDContext[id] = timeoutId;
    }
  }

  function abortMouseleavePanelEvent(id?: string) {
    (id ? [id] : [...Object.keys(cancelIDContext)]).forEach(k => {
      window.clearTimeout(cancelIDContext[k]);
      delete cancelIDContext[k];
    });
  }

  let restoreMinify = false;
  function togglePanelEvent(id: string, collapse?: boolean) {
    setTimeout(() => {
      let element = q(`#${id}-panel`);
      if (!element) return;
      if (collapse === false) {
        element.classList.remove("p-collapse");
        return;
      }
      if (collapse === true) {
        collapsePanelEvent(element, id);
        if (BIFM.visible) {
          BIFM.frame.focus();
        } else {
          HTML.fullViewGrid.focus();
        }
        return;
      }

      if (!element.classList.toggle("p-collapse")) { // not collapsed
        ["config", "downloader"].filter(k => k !== id).forEach(k => togglePanelEvent(k, true));
        if (!conf.autoCollapsePanel) {
          PH.minify(false, "fullViewGrid");
          restoreMinify = true;
        }
      } else { // collapsed
        if (restoreMinify) {
          PH.minify(true, BIFM.visible ? "bigImageFrame" : "fullViewGrid");
          restoreMinify = false;
        }
      }
    }, 10);
  }

  let bodyOverflow = document.body.style.overflow;
  function showFullViewGrid() {
    // HTML.fullViewGrid.scroll(0, 0); //否则加载会触发滚动事件
    PH.minify(true, "fullViewGrid");
    HTML.fullViewGrid.classList.remove("full-view-grid-collapse");
    HTML.fullViewGrid.focus();
    document.body.style.overflow = "hidden";
  };

  function hiddenFullViewGridEvent(event: Event) {
    if (event.target === HTML.fullViewGrid || (event.target as HTMLElement).classList.contains("img-node")) {
      main(false);
    }
  };

  function hiddenFullViewGrid() {
    BIFM.hidden();
    PH.minify(false, "fullViewGrid");
    HTML.fullViewGrid.classList.add("full-view-grid-collapse");
    HTML.fullViewGrid.blur();
    q("html").focus();
    document.body.style.overflow = bodyOverflow;
  };

  //全屏阅览元素的滚动事件
  function scrollEvent() {
    //对冒泡的处理
    if (HTML.fullViewGrid.classList.contains("full-view-grid-collapse")) return;
    //根据currTop获取当前滚动高度对应的未渲染缩略图的图片元素
    PF.renderCurrView();
    PF.appendNextPages();
  };

  //大图框架元素的滚轮事件/按下鼠标右键滚动则是缩放/直接滚动则是切换到下一张或上一张
  function bigImageWheelEvent(event: WheelEvent) {
    IFQ.stepImageEvent(event.deltaY > 0 ? "next" : "prev");
  };


  // keyboardEvents
  function scrollImage(oriented: Oriented): boolean {
    BIFM.frame.addEventListener("scrollend", () => {
      if (conf.readMode === "singlePage" && BIFM.isReachBoundary(oriented)) {
        BIFM.tryPreventStep();
      }
    }, { once: true });
    if (BIFM.isReachBoundary(oriented)) {
      HTML.bigImageFrame.dispatchEvent(new WheelEvent("wheel", { deltaY: oriented === "prev" ? -1 : 1 }));
      return true;
    }
    return false;
  }

  let scrolling = false;
  function initKeyboardEvent(): KeyboardEvents {
    const onbigImageFrame: Record<KeyboardInBigImageModeId, KeyboardDesc> = {
      "exit-big-image-mode": new KeyboardDesc(
        ["Escape", "Enter"],
        () => BIFM.hidden()
      ),
      "step-image-prev": new KeyboardDesc(
        ["ArrowLeft"],
        () => IFQ.stepImageEvent(conf.reversePages ? "next" : "prev")
      ),
      "step-image-next": new KeyboardDesc(
        ["ArrowRight"],
        () => IFQ.stepImageEvent(conf.reversePages ? "prev" : "next")
      ),
      "step-to-first-image": new KeyboardDesc(
        ["Home"],
        () => IFQ.do(0, "next")
      ),
      "step-to-last-image": new KeyboardDesc(
        ["End"],
        () => IFQ.do(IFQ.length - 1, "prev")
      ),
      "scale-image-increase": new KeyboardDesc(
        ["="],
        () => BIFM.scaleBigImages(1, 5)
      ),
      "scale-image-decrease": new KeyboardDesc(
        ["-"],
        () => BIFM.scaleBigImages(-1, 5)
      ),
      "scroll-image-up": new KeyboardDesc(
        ["PageUp", "ArrowUp", "Shift+Space"],
        (event) => {
          const key = parseKey(event);
          if (!["PageUp", "ArrowUp", "Shift+Space"].includes(key)) {
            if (scrolling) return;
            scrolling = true;
            BIFM.frame.addEventListener("scrollend", () => scrolling = false, { once: true });
            BIFM.frame.scrollBy({ left: 0, top: -(BIFM.frame.clientHeight / 2), behavior: "smooth" })
          }
          if (scrollImage("prev")) {
            event.preventDefault();
            scrolling = false;
          }
        }, true
      ),
      "scroll-image-down": new KeyboardDesc(
        ["PageDown", "ArrowDown", "Space"],
        (event) => {
          const key = parseKey(event);
          if (!["PageDown", "ArrowDown", "Space"].includes(key)) {
            if (scrolling) return;
            scrolling = true;
            BIFM.frame.addEventListener("scrollend", () => scrolling = false, { once: true });
            BIFM.frame.scrollBy({ left: 0, top: BIFM.frame.clientHeight / 2, behavior: "smooth" })
          }
          if (scrollImage("next")) {
            event.preventDefault();
            scrolling = false;
          }
        }, true
      ),
    };
    const onFullViewGrid: Record<KeyboardInFullViewGridId, KeyboardDesc> = {
      "open-big-image-mode": new KeyboardDesc(
        ["Enter"], () => {
          let start = IFQ.currIndex;
          if (numberRecord && numberRecord.length > 0) {
            start = Number(numberRecord.join("")) - 1;
            numberRecord = null;
            if (isNaN(start)) return;
            start = Math.max(0, Math.min(start, IFQ.length - 1));
          }
          IFQ[start].node.imgElement?.dispatchEvent(new MouseEvent("click"));
        }
      ),
      "pause-auto-load-temporarily": new KeyboardDesc(
        ["p"],
        () => {
          IL.autoLoad = !IL.autoLoad;
          if (IL.autoLoad) {
            IL.abort(IFQ.currIndex);
          }
        }
      ),
      "exit-full-view-grid": new KeyboardDesc(
        ["Escape"],
        () => main(false)
      ),
      "columns-increase": new KeyboardDesc(
        ["="],
        () => modNumberConfigEvent("colCount", "add")
      ),
      "columns-decrease": new KeyboardDesc(
        ["-"],
        () => modNumberConfigEvent("colCount", "minus")
      ),
    };
    const inMain: Record<KeyboardInMainId, KeyboardDesc> = {
      "open-full-view-grid": new KeyboardDesc(["Enter"], (_) => {
        // check focus element is not input Elements
        const activeElement = document.activeElement;
        if (activeElement instanceof HTMLInputElement || activeElement instanceof HTMLSelectElement) return;
        main(true);
      }, true),
    };
    return { inBigImageMode: onbigImageFrame, inFullViewGrid: onFullViewGrid, inMain: inMain }
  }
  const keyboardEvents = initKeyboardEvent();

  // use keyboardEvents
  let numberRecord: number[] | null = null;
  function fullViewGridKeyBoardEvent(event: KeyboardEvent) {
    const key = parseKey(event);
    if (!HTML.bigImageFrame.classList.contains("big-img-frame-collapse")) {
      const triggered = Object.entries(keyboardEvents.inBigImageMode).some(([id, desc]) => {
        const override = conf.keyboards.inBigImageMode[id as KeyboardInBigImageModeId];
        // override !== undefined never check defaultKeys
        if ((override !== undefined && override.length > 0) ? override.includes(key) : desc.defaultKeys.includes(key)) {
          desc.cb(event);
          return !desc.noPreventDefault;

        }
        return false;
      });
      if (triggered) {
        event.preventDefault();
      }
    } else if (!HTML.fullViewGrid.classList.contains("full-view-grid-collapse")) {
      const triggered = Object.entries(keyboardEvents.inFullViewGrid).some(([id, desc]) => {
        const override = conf.keyboards.inFullViewGrid[id as KeyboardInFullViewGridId];
        if ((override !== undefined && override.length > 0) ? override.includes(key) : desc.defaultKeys.includes(key)) {
          desc.cb(event);
          return !desc.noPreventDefault;
        }
        return false;
      });
      if (triggered) {
        event.preventDefault();
      } else if (event.key.length === 1 && event.key >= "0" && event.key <= "9") {
        numberRecord = numberRecord ? [...numberRecord, Number(event.key)] : [Number(event.key)];
        event.preventDefault();
      }
    }
  }

  function keyboardEvent(event: KeyboardEvent) {
    if (!HTML.fullViewGrid.classList.contains("full-view-grid-collapse")) return;
    if (!HTML.bigImageFrame.classList.contains("big-img-frame-collapse")) return;
    const key = parseKey(event);
    const triggered = Object.entries(keyboardEvents.inMain).some(([id, desc]) => {
      const override = conf.keyboards.inMain[id as KeyboardInMainId];
      if (override !== undefined ? override.includes(key) : desc.defaultKeys.includes(key)) {
        desc.cb(event);
        return !desc.noPreventDefault;
      }
      return false;
    });
    if (triggered) {
      event.preventDefault();
    }
  };

  // 显示简易指南事件
  function showGuideEvent() {
    const oldGuide = document.getElementById("ehvp-guide");
    if (oldGuide) {
      oldGuide.remove();
    }
    const guideElement = document.createElement("div");
    guideElement.setAttribute("id", "ehvp-guide")
    guideElement.innerHTML = `<div style="width: 50vw; min-height: 300px; border: 1px solid black; background-color: rgba(255, 255, 255, 0.8); font-weight: bold; line-height: 30px">${i18n.help.get()}</div>`;
    guideElement.classList.add("ehvp-full-panel");
    guideElement.setAttribute("style", `align-items: center; color: black; text-align: left;`);
    guideElement.addEventListener("click", () => guideElement.remove());
    if (HTML.fullViewGrid.classList.contains("full-view-grid-collapse")) {
      document.body.after(guideElement);
    } else {
      HTML.fullViewGrid.appendChild(guideElement);
    }
  };

  function showKeyboardCustomEvent() {
    createKeyboardCustomPanel(keyboardEvents, HTML.fullViewGrid);
  }

  function showExcludeURLEvent() {
    createExcludeURLPanel(HTML.fullViewGrid);
  }

  const signal = { first: true };
  // 入口
  function main(extend: boolean) {
    if (HTML.pageHelper) {
      if (extend && !HTML.pageHelper.classList.contains("p-helper-extend")) {
        HTML.pageHelper.classList.add("p-helper-extend");
        showFullViewGrid();
        if (signal.first) {
          signal.first = false;
          PF.init().then(() => IL.start(IL.lockVer));
        }
      } else {
        HTML.pageHelper.classList.remove("p-helper-extend");
        hiddenFullViewGrid();
        ["config", "downloader"].forEach(id => togglePanelEvent(id, true));
      }
    }
  }
  return {
    main,

    modNumberConfigEvent,
    modBooleanConfigEvent,
    modSelectConfigEvent,
    modPageHelperPostion,

    togglePanelEvent,
    showFullViewGrid,
    hiddenFullViewGridEvent,
    hiddenFullViewGrid,

    scrollEvent,
    bigImageWheelEvent,
    fullViewGridKeyBoardEvent,
    keyboardEvent,
    showGuideEvent,
    collapsePanelEvent,
    abortMouseleavePanelEvent,
    showKeyboardCustomEvent,
    showExcludeURLEvent,
  }
}
