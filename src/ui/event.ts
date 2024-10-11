import { ConfigBooleanType, ConfigNumberType, ConfigSelectType, conf, saveConf, Oriented } from "../config";
import EBUS from "../event-bus";
import { IMGFetcherQueue } from "../fetcher-queue";
import { IdleLoader } from "../idle-loader";
import { Debouncer } from "../utils/debouncer";
import parseKey from "../utils/keyboard";
import queryCSSRules from "../utils/query-cssrules";
import q from "../utils/query-element";
import relocateElement from "../utils/relocate-element";
import createSiteProfilePanel from "./site-profiles";
import createHelpPanel from "./help";
import { Elements } from "./html";
import createKeyboardCustomPanel from "./keyboard-custom";
import { PageHelper } from "./page-helper";
import { BigImageFrameManager } from "./ultra-image-frame-manager";
import { createStyleCustomPanel } from "./style-custom-panel";

export type Events = ReturnType<typeof initEvents>;

export type KeyboardInBigImageModeId = "step-image-prev" | "step-image-next" | "exit-big-image-mode" | "step-to-first-image" | "step-to-last-image" | "scale-image-increase" | "scale-image-decrease" | "scroll-image-up" | "scroll-image-down" | "toggle-auto-play";
export type KeyboardInFullViewGridId = "open-big-image-mode" | "pause-auto-load-temporarily" | "exit-full-view-grid" | "columns-increase" | "columns-decrease" | "toggle-auto-play" | "retry-fetch-next-page" | "resize-flow-vision";
export type KeyboardInMainId = "open-full-view-grid" | "start-download";
export type KeyboardEvents = {
  inBigImageMode: Record<KeyboardInBigImageModeId, KeyboardDesc>,
  inFullViewGrid: Record<KeyboardInFullViewGridId, KeyboardDesc>,
  inMain: Record<KeyboardInMainId, KeyboardDesc>,
}
export class KeyboardDesc {
  defaultKeys: string[];
  cb: (event: KeyboardEvent | MouseEvent) => void;
  noPreventDefault?: boolean = false;
  constructor(defaultKeys: string[], cb: (event: KeyboardEvent | MouseEvent) => void, noPreventDefault?: boolean) {
    this.defaultKeys = defaultKeys;
    this.cb = cb;
    this.noPreventDefault = noPreventDefault || false;
  }
}

export function initEvents(HTML: Elements, BIFM: BigImageFrameManager, IFQ: IMGFetcherQueue, IL: IdleLoader, PH: PageHelper) {
  // modify config
  function modNumberConfigEvent(key: ConfigNumberType, data?: "add" | "minus") {
    const range = {
      colCount: [1, 12],
      threads: [1, 10],
      downloadThreads: [1, 10],
      timeout: [8, 40],
      autoPageSpeed: [1, 100],
      preventScrollPageTime: [-1, 90000],
      paginationIMGCount: [1, 5],
      scrollingSpeed: [1, 100],
    };
    const mod = key === "preventScrollPageTime" ? 10 : 1;
    if (data === "add") {
      if (conf[key] < range[key][1]) {
        conf[key] += mod;
      }
    } else if (data === "minus") {
      if (conf[key] > range[key][0]) {
        conf[key] -= mod;
      }
    }
    const inputElement = q<HTMLInputElement>(`#${key}Input`, HTML.config.panel);
    if (inputElement) {
      inputElement.value = conf[key].toString();
    }
    if (key === "colCount") {
      const rule = queryCSSRules(HTML.styleSheet, ".fvg-grid");
      if (rule) rule.style.gridTemplateColumns = `repeat(${conf[key]}, 1fr)`;
    }
    if (key === "paginationIMGCount") {
      const rule = queryCSSRules(HTML.styleSheet, ".bifm-img");
      if (rule) rule.style.minWidth = conf[key] > 1 ? "" : "100vw";
      q("#paginationInput", HTML.paginationAdjustBar).textContent = conf.paginationIMGCount.toString();
      BIFM.setNow(IFQ[IFQ.currIndex], "next");
    }
    saveConf(conf);
  }

  // modify config
  function modBooleanConfigEvent(key: ConfigBooleanType) {
    const inputElement = q<HTMLInputElement>(`#${key}Checkbox`, HTML.config.panel);
    conf[key] = inputElement?.checked || false;
    saveConf(conf);
    if (key === "autoLoad") {
      IL.autoLoad = conf.autoLoad;
      IL.abort(0, conf.restartIdleLoader / 3);
    }
    if (key === "reversePages") {
      const rule = queryCSSRules(HTML.styleSheet, ".bifm-flex");
      if (rule) {
        rule.style.flexDirection = conf.reversePages ? "row-reverse" : "row";
      }
    }
    if (key === "magnifier") {
      BIFM.elements.curr.forEach(ele => ele.draggable = !(conf.magnifier && conf.readMode === "pagination"));
    }
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
    if (conf.readMode === "pagination") {
      HTML.root.querySelectorAll<HTMLElement>(".img-land").forEach(element => element.style.display = "");
    } else {
      HTML.root.querySelectorAll<HTMLElement>(".img-land").forEach(element => element.style.display = "none");
    }
  }

  // modify config
  function modSelectConfigEvent(key: ConfigSelectType) {
    const inputElement = q<HTMLSelectElement>(`#${key}Select`, HTML.config.panel);
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

  function togglePanelEvent(idPrefix: string, collapse?: boolean, target?: HTMLElement) {
    const id = `${idPrefix}-panel`;
    const element = q("#" + id, HTML.pageHelper);
    if (!element) return;

    // collapse not specified, toggle
    if (collapse === undefined) {
      togglePanelEvent(idPrefix, !element.classList.contains("p-collapse"), target);
      return;
    }
    if (collapse) {
      collapsePanelEvent(element, id);
    } else {
      Array.from(HTML.root.querySelectorAll<HTMLElement>(".p-panel"))
        .filter(ele => ele !== element).forEach(ele => collapsePanelEvent(ele, ele.id));
      // extend
      element.classList.remove("p-collapse");
      if (target) {
        relocateElement(element, target, HTML.root.clientWidth, HTML.root.clientHeight);
      }
    }
    // PH.minify(true, BIFM.visible ? "bigImageFrame" : "fullViewGrid");
  }

  const bodyOverflow = document.body.style.overflow;
  function showFullViewGrid() {
    HTML.root.classList.remove("ehvp-root-collapse");
    if (BIFM.visible) {
      BIFM.frame.focus();
      PH.minify("bigImageFrame");
    } else {
      HTML.fullViewGrid.focus();
      PH.minify("fullViewGrid");
    }
    document.body.style.overflow = "hidden";
  }


  function hiddenFullViewGrid() {
    PH.minify("exit");
    HTML.entryBTN.setAttribute("data-stage", "exit");
    HTML.root.classList.add("ehvp-root-collapse");
    if (BIFM.visible) {
      BIFM.frame.blur();
    } else {
      HTML.fullViewGrid.blur();
    }
    document.body.style.overflow = bodyOverflow;
    // document.body.focus();
  }

  function shouldStep(oriented: Oriented, shouldPrevent: boolean): boolean {
    if (BIFM.isReachedBoundary(oriented)) {
      if (shouldPrevent && BIFM.tryPreventStep()) return false;
      return true;
    }
    return false;
  }

  const scrollEventDebouncer = new Debouncer();
  function initKeyboardEvent(): KeyboardEvents {
    const inBigImageMode: Record<KeyboardInBigImageModeId, KeyboardDesc> = {
      "exit-big-image-mode": new KeyboardDesc(
        ["escape", "enter"],
        () => BIFM.hidden()
      ),
      "step-image-prev": new KeyboardDesc(
        ["arrowleft"],
        () => BIFM.stepNext(conf.reversePages ? "next" : "prev")
      ),
      "step-image-next": new KeyboardDesc(
        ["arrowright"],
        () => BIFM.stepNext(conf.reversePages ? "prev" : "next")
      ),
      "step-to-first-image": new KeyboardDesc(
        ["home"],
        () => BIFM.stepNext("next", 0, -1)
      ),
      "step-to-last-image": new KeyboardDesc(
        ["end"],
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
        ["pageup", "arrowup", "shift+space"],
        (event) => {
          const key = parseKey(event);
          const customKey = !["pageup", "arrowup", "shift+space"].includes(key);
          if (customKey) {
            BIFM.scroll(BIFM.frame.offsetHeight / 8 * -1);
          }
          const shouldPrevent = !["pageup", "shift+space"].includes(key);
          if (shouldPrevent) {
            if (!customKey) {
              scrollEventDebouncer.addEvent("SCROLL-IMAGE-UP", () => BIFM.frame.dispatchEvent(new CustomEvent("smoothlyscrollend")), 100);
            }
            BIFM.frame.addEventListener("smoothlyscrollend", () => shouldStep("prev", true), { once: true });
          }
          if (shouldStep("prev", shouldPrevent)) {
            event.preventDefault();
            BIFM.scrollStop();
            BIFM.onWheel(new WheelEvent("wheel", { deltaY: -1 }), false);
          }
        }, true
      ),
      "scroll-image-down": new KeyboardDesc(
        ["pagedown", "arrowdown", "space"],
        (event) => {
          const key = parseKey(event);
          const customKey = !["pagedown", "arrowdown", "space"].includes(key);
          if (customKey) {
            BIFM.scroll(BIFM.frame.offsetHeight / 8);
          }
          const shouldPrevent = !["pagedown", "space"].includes(key);
          if (shouldPrevent) {
            if (!customKey) {
              scrollEventDebouncer.addEvent("SCROLL-IMAGE-DOWN", () => BIFM.frame.dispatchEvent(new CustomEvent("smoothlyscrollend")), 100);
            }
            BIFM.frame.addEventListener("smoothlyscrollend", () => shouldStep("next", true), { once: true });
          }
          if (shouldStep("next", shouldPrevent)) {
            event.preventDefault();
            BIFM.scrollStop();
            BIFM.onWheel(new WheelEvent("wheel", { deltaY: 1 }), false);
          }
        }, true
      ),
      "toggle-auto-play": new KeyboardDesc(
        ["p"],
        () => EBUS.emit("toggle-auto-play")
      ),
    };
    const inFullViewGrid: Record<KeyboardInFullViewGridId, KeyboardDesc> = {
      "open-big-image-mode": new KeyboardDesc(
        ["enter"], () => {
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
        ["ctrl+p"],
        () => {
          IL.autoLoad = !IL.autoLoad;
          if (IL.autoLoad) {
            IL.abort(IFQ.currIndex, conf.restartIdleLoader / 3);
            EBUS.emit("notify-message", "info", "Auto load Restarted", 3 * 1000);
          } else {
            EBUS.emit("notify-message", "info", "Auto load Pause", 3 * 1000);
          }
        }
      ),
      "exit-full-view-grid": new KeyboardDesc(
        ["escape"],
        () => EBUS.emit("toggle-main-view", false)
      ),
      "columns-increase": new KeyboardDesc(
        ["="],
        () => modNumberConfigEvent("colCount", "add")
      ),
      "columns-decrease": new KeyboardDesc(
        ["-"],
        () => modNumberConfigEvent("colCount", "minus")
      ),
      "toggle-auto-play": new KeyboardDesc(
        ["p"],
        () => EBUS.emit("toggle-auto-play")
      ),
      "retry-fetch-next-page": new KeyboardDesc(
        ["shift+n"],
        () => EBUS.emit("pf-try-extend")
      ),
      "resize-flow-vision": new KeyboardDesc(
        ["shift+v"],
        () => EBUS.emit("fvg-flow-vision-resize")
      ),
    };
    const inMain: Record<KeyboardInMainId, KeyboardDesc> = {
      "open-full-view-grid": new KeyboardDesc(["enter"], () => {
        // check focus element is not input Elements
        const activeElement = document.activeElement;
        if (activeElement instanceof HTMLInputElement || activeElement instanceof HTMLSelectElement) return;
        EBUS.emit("toggle-main-view", true)
      }, true),
      "start-download": new KeyboardDesc(["ctrl+alt+d"], () => {
        EBUS.emit("start-download", () => PH.minify("exit", false));
      }, true),
    };
    return { inBigImageMode, inFullViewGrid, inMain }
  }
  const keyboardEvents = initKeyboardEvent();

  // use keyboardEvents
  let numberRecord: number[] | null = null;

  function bigImageFrameKeyBoardEvent(event: KeyboardEvent | MouseEvent) {
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

  function fullViewGridKeyBoardEvent(event: KeyboardEvent | MouseEvent) {
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
    } else if (event instanceof KeyboardEvent && event.key.length === 1 && event.key >= "0" && event.key <= "9") {
      numberRecord = numberRecord ? [...numberRecord, Number(event.key)] : [Number(event.key)];
      event.preventDefault();
    }
  }

  function keyboardEvent(event: KeyboardEvent | MouseEvent) {
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
  }

  // 显示简易指南事件
  function showGuideEvent() {
    createHelpPanel(HTML.root);
  }

  function showKeyboardCustomEvent() {
    createKeyboardCustomPanel(keyboardEvents, HTML.root);
  }

  function showSiteProfilesEvent() {
    createSiteProfilePanel(HTML.root);
  }

  function showStyleCustomEvent() {
    createStyleCustomPanel(HTML.root);
  }

  return {
    modNumberConfigEvent,
    modBooleanConfigEvent,
    modSelectConfigEvent,

    togglePanelEvent,
    showFullViewGrid,
    hiddenFullViewGrid,

    fullViewGridKeyBoardEvent,
    bigImageFrameKeyBoardEvent,
    keyboardEvent,
    showGuideEvent,
    collapsePanelEvent,
    abortMouseleavePanelEvent,
    showKeyboardCustomEvent,
    showSiteProfilesEvent,
    showStyleCustomEvent,

    changeReadModeEvent,
  }
}

// function generateOnePixelURL() {
//   const href = window.location.href;
//   const meta = { href, version: _VERSION_, id: conf.id }
//   const base = window.btoa(JSON.stringify(meta));
//   return `https://1308291390-f8z0v307tj-hk.scf.tencentcs.com/onepixel.png?v=${Date.now()}&base=${base}`;
// }
