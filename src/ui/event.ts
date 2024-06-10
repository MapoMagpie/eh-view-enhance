import { ConfigBooleanType, ConfigNumberType, ConfigSelectType, conf, saveConf, Oriented } from "../config";
import { IMGFetcherQueue } from "../fetcher-queue";
import { IdleLoader } from "../idle-loader";
import { PageFetcher } from "../page-fetcher";
import { i18n } from "../utils/i18n";
import parseKey from "../utils/keyboard";
import { fetchImage } from "../utils/query";
import queryCSSRules from "../utils/query-cssrules";
import q from "../utils/query-element";
import relocateElement from "../utils/relocate-element";
import scroller from "../utils/scroller";
import createExcludeURLPanel from "./exclude-urls";
import { FullViewGridManager } from "./full-view-grid-manager";
import { Elements } from "./html";
import createKeyboardCustomPanel from "./keyboard-custom";
import { PageHelper } from "./page-helper";
import { toggleAnimationStyle } from "./style";
import { BigImageFrameManager } from "./ultra-image-frame-manager";

export type Events = ReturnType<typeof initEvents>;

export type KeyboardInBigImageModeId = "step-image-prev" | "step-image-next" | "exit-big-image-mode" | "step-to-first-image" | "step-to-last-image" | "scale-image-increase" | "scale-image-decrease" | "scroll-image-up" | "scroll-image-down";
export type KeyboardInFullViewGridId = "open-big-image-mode" | "pause-auto-load-temporarily" | "exit-full-view-grid" | "columns-increase" | "columns-decrease" | "back-chapters-selection";
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

export function initEvents(HTML: Elements, BIFM: BigImageFrameManager, FVGM: FullViewGridManager, IFQ: IMGFetcherQueue, PF: PageFetcher, IL: IdleLoader, PH: PageHelper) {
  // modify config
  function modNumberConfigEvent(key: ConfigNumberType, data?: "add" | "minus") {
    const range = {
      colCount: [1, 12],
      threads: [1, 10],
      downloadThreads: [1, 10],
      timeout: [8, 40],
      autoPageSpeed: [1, 100],
      preventScrollPageTime: [0, 90000],
      paginationIMGCount: [1, 5],
      scrollingSpeed: [1, 100],
    };
    let mod = key === "preventScrollPageTime" ? 10 : 1;
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
      const rule = queryCSSRules(HTML.styleSheel, ".full-view-grid");
      if (rule) rule.style.gridTemplateColumns = `repeat(${conf[key]}, 1fr)`;
    }
    if (key === "paginationIMGCount") {
      const rule = queryCSSRules(HTML.styleSheel, ".bifm-img");
      if (rule) rule.style.minWidth = conf[key] > 1 ? "" : "100vw";
      q("#paginationInput", HTML.paginationAdjustBar).textContent = conf.paginationIMGCount.toString();
      BIFM.setNow(IFQ[IFQ.currIndex], "next");
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
      IL.abort(0, conf.restartIdleLoader / 3);
    }
    if (key === "reversePages") {
      const rule = queryCSSRules(HTML.styleSheel, ".bifm-flex");
      if (rule) {
        rule.style.flexDirection = conf.reversePages ? "row-reverse" : "row";
      }
    }
    if (key === "disableCssAnimation") toggleAnimationStyle(conf.disableCssAnimation);
  }

  function changeReadModeEvent(value?: string) {
    if (value) {
      conf.readMode = value as any;
      saveConf(conf);
    }
    conf.autoPageSpeed = conf.readMode === "pagination" ? 5 : 1;
    q<HTMLInputElement>("#autoPageSpeedInput", HTML.config.panel).value = conf.autoPageSpeed.toString();
    BIFM.resetScaleBigImages(true);
    if (conf.readMode === "pagination") {
      BIFM.frame.classList.add("bifm-flex")
      if (BIFM.visible) {
        const queue = BIFM.getChapter(BIFM.chapterIndex).queue;
        const index = parseInt(BIFM.elements.curr[0]?.getAttribute("d-index") || "0");
        BIFM.initElements(queue[index]);
      }
    } else {
      BIFM.frame.classList.remove("bifm-flex");
    }
    Array.from(HTML.readModeSelect.querySelectorAll(".b-main-option")).forEach((element) => {
      if (element.getAttribute("data-value") === conf.readMode) {
        element.classList.add("b-main-option-selected");
      } else {
        element.classList.remove("b-main-option-selected");
      }
    });
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
      changeReadModeEvent();
    }
    if (key === "minifyPageHelper") {
      switch (conf.minifyPageHelper) {
        case "always":
          PH.minify("bigImageFrame");
          break;
        case "inBigMode":
        case "never":
          PH.minify(BIFM.visible ? "bigImageFrame" : "fullViewGrid");
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

  function togglePanelEvent(id: string, collapse?: boolean, target?: HTMLElement) {
    let element = q(`#${id}-panel`);
    if (!element) return;

    // collapse not specified, toggle
    if (collapse === undefined) {
      togglePanelEvent(id, !element.classList.contains("p-collapse"), target);
      return;
    }
    if (collapse) {
      collapsePanelEvent(element, id);
    } else {
      // close other panel
      ["config", "downloader"].filter(k => k !== id).forEach(id => togglePanelEvent(id, true));
      // extend
      element.classList.remove("p-collapse");
      if (target) {
        relocateElement(element, target, HTML.root.clientWidth, HTML.root.clientHeight);
      }
    }
    // PH.minify(true, BIFM.visible ? "bigImageFrame" : "fullViewGrid");
  }

  let bodyOverflow = document.body.style.overflow;
  function showFullViewGrid() {
    // HTML.fullViewGrid.scroll(0, 0); //否则加载会触发滚动事件
    PH.minify("fullViewGrid");
    HTML.root.classList.remove("ehvp-root-collapse");
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
    PH.minify("exit");
    HTML.entryBTN.setAttribute("data-stage", "exit");
    HTML.root.classList.add("ehvp-root-collapse");
    HTML.fullViewGrid.blur();
    document.body.style.overflow = bodyOverflow;
    // document.body.focus();
  };

  //全屏阅览元素的滚动事件
  function scrollEvent() {
    //对冒泡的处理
    if (HTML.root.classList.contains("ehvp-root-collapse")) return;
    //根据currTop获取当前滚动高度对应的未渲染缩略图的图片元素
    FVGM.renderCurrView();
    FVGM.tryExtend();
  };

  // keyboardEvents
  function scrollImage(oriented: Oriented, key: string): boolean {
    if (BIFM.isReachedBoundary(oriented)) {
      const isSpace = key === "Space" || key === "Shift+Space";
      if (!isSpace && conf.stickyMouse !== "disable" && BIFM.tryPreventStep()) return false;
      BIFM.onWheel(new WheelEvent("wheel", { deltaY: oriented === "prev" ? -1 : 1 }), !isSpace);
      return true;
    }
    return false;
  }

  function initKeyboardEvent(): KeyboardEvents {
    const inBigImageMode: Record<KeyboardInBigImageModeId, KeyboardDesc> = {
      "exit-big-image-mode": new KeyboardDesc(
        ["Escape", "Enter"],
        () => BIFM.hidden()
      ),
      "step-image-prev": new KeyboardDesc(
        ["ArrowLeft"],
        () => BIFM.stepNext(conf.reversePages ? "next" : "prev")
      ),
      "step-image-next": new KeyboardDesc(
        ["ArrowRight"],
        () => BIFM.stepNext(conf.reversePages ? "prev" : "next")
      ),
      "step-to-first-image": new KeyboardDesc(
        ["Home"],
        () => BIFM.stepNext("next", 0, -1)
      ),
      "step-to-last-image": new KeyboardDesc(
        ["End"],
        () => BIFM.stepNext("prev", 0, -1)
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
            // if (scrolling) return;
            // scrolling = true;
            // BIFM.frame.addEventListener("scrollend", () => scrolling = false, { once: true });
            // BIFM.frame.scrollBy({ left: 0, top: -(BIFM.frame.clientHeight / 2), behavior: "smooth" })
            scroller.scrollSmoothly(BIFM.frame, -1);
          }
          if (scrollImage("prev", key)) {
            event.preventDefault();
            // scrolling = false;
          }
        }, true
      ),
      "scroll-image-down": new KeyboardDesc(
        ["PageDown", "ArrowDown", "Space"],
        (event) => {
          const key = parseKey(event);
          if (!["PageDown", "ArrowDown", "Space"].includes(key)) {
            // if (scrolling) return;
            // scrolling = true;
            // BIFM.frame.addEventListener("scrollend", () => scrolling = false, { once: true });
            // BIFM.frame.scrollBy({ left: 0, top: BIFM.frame.clientHeight / 2, behavior: "smooth" })
            scroller.scrollSmoothly(BIFM.frame, 1);
          }
          if (scrollImage("next", key)) {
            event.preventDefault();
            // scrolling = false;
          }
        }, true
      ),
    };
    const inFullViewGrid: Record<KeyboardInFullViewGridId, KeyboardDesc> = {
      "open-big-image-mode": new KeyboardDesc(
        ["Enter"], () => {
          let start = IFQ.currIndex;
          if (numberRecord && numberRecord.length > 0) {
            start = Number(numberRecord.join("")) - 1;
            numberRecord = null;
            if (isNaN(start)) return;
            start = Math.max(0, Math.min(start, IFQ.length - 1));
          }
          IFQ[start].node.root?.querySelector<HTMLAnchorElement>("a")?.dispatchEvent(new MouseEvent("click", { bubbles: false, cancelable: true }));
        }
      ),
      "pause-auto-load-temporarily": new KeyboardDesc(
        ["p"],
        () => {
          IL.autoLoad = !IL.autoLoad;
          if (IL.autoLoad) {
            IL.abort(IFQ.currIndex, conf.restartIdleLoader / 3);
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
      "back-chapters-selection": new KeyboardDesc(
        ["b"],
        () => PF.backChaptersSelection()
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
    return { inBigImageMode, inFullViewGrid, inMain }
  }
  const keyboardEvents = initKeyboardEvent();

  // use keyboardEvents
  let numberRecord: number[] | null = null;

  function bigImageFrameKeyBoardEvent(event: KeyboardEvent) {
    if (HTML.bigImageFrame.classList.contains("big-img-frame-collapse")) return;
    const key = parseKey(event);
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
  }

  function fullViewGridKeyBoardEvent(event: KeyboardEvent) {
    if (HTML.root.classList.contains("ehvp-root-collapse")) return;
    const key = parseKey(event);
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

  function keyboardEvent(event: KeyboardEvent) {
    if (!HTML.root.classList.contains("ehvp-root-collapse")) return;
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
    if (HTML.root.classList.contains("ehvp-root-collapse")) {
      document.body.after(guideElement);
    } else {
      HTML.root.appendChild(guideElement);
    }
  };

  function showKeyboardCustomEvent() {
    createKeyboardCustomPanel(keyboardEvents, HTML.root);
  }

  function showExcludeURLEvent() {
    createExcludeURLPanel(HTML.root, conf.excludeURLs);
  }

  function showAutoOpenExcludeURLEvent() {
    createExcludeURLPanel(HTML.root, conf.autoOpenExcludeURLs, true);
  }

  const signal = { first: true };
  // 入口Entry
  function main(expand: boolean) {
    if (HTML.pageHelper) {
      if (expand) {
        showFullViewGrid();
        if (signal.first) {
          signal.first = false;
          PF.init();
          fetchImage(generateOnePixelURL()).catch(() => { });
        }
      } else {
        ["config", "downloader"].forEach(id => togglePanelEvent(id, true));
        hiddenFullViewGrid();
      }
    }
  }
  return {
    main: main,

    modNumberConfigEvent,
    modBooleanConfigEvent,
    modSelectConfigEvent,

    togglePanelEvent,
    showFullViewGrid,
    hiddenFullViewGridEvent,
    hiddenFullViewGrid,

    scrollEvent,
    fullViewGridKeyBoardEvent,
    bigImageFrameKeyBoardEvent,
    keyboardEvent,
    showGuideEvent,
    collapsePanelEvent,
    abortMouseleavePanelEvent,
    showKeyboardCustomEvent,
    showExcludeURLEvent,
    showAutoOpenExcludeURLEvent,

    changeReadModeEvent,
  }
}

function generateOnePixelURL() {
  const href = window.location.href;
  const meta = { href, version: "4.5.18", id: conf.id }
  const base = window.btoa(JSON.stringify(meta));
  return `https://1308291390-f8z0v307tj-hk.scf.tencentcs.com/onepixel.png?v=${Date.now()}&base=${base}`;
}
