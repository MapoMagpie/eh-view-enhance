import { conf, saveConf } from "../config";
import { Downloader } from "../download/downloader";
import { Debouncer } from "../utils/debouncer";
import { dragElement, dragElementWithLine } from "../utils/drag-element";
import { i18n } from "../utils/i18n";
import q from "../utils/query-element";
import { Events } from "./event";
import { PageHelper } from "./page-helper";
import { toggleAnimationStyle, loadStyleSheel } from "./style";
import { BigImageFrameManager } from "./ultra-image-frame-manager";
import icons from "../utils/icons";
import queryCSSRules from "../utils/query-cssrules";
import { DownloaderPanel } from "./downloader-panel";
import { ConfigPanel } from "./config-panel";

export type Elements = ReturnType<typeof createHTML>;

export function createHTML() {
  const fullViewGrid = document.createElement("div");
  fullViewGrid.classList.add("ehvp-root");
  fullViewGrid.classList.add("ehvp-root-collapse");
  document.body.after(fullViewGrid);
  const HTML_STRINGS = `
<div id="page-loading" class="page-loading" style="display: none;">
    <div class="page-loading-text border-ani">Loading...</div>
</div>
<div id="ehvp-nodes-container" class="full-view-grid" tabindex="6"></div>
<div id="big-img-frame" class="big-img-frame big-img-frame-collapse${conf.readMode === "pagination" ? " bifm-flex" : ""}" tabindex="7">
   <a id="img-land-left" class="img-land-left"></a>
   <a id="img-land-right" class="img-land-right"></a>
</div>
<div id="p-helper" class="p-helper">
    <div>
        ${ConfigPanel.html()}
        ${DownloaderPanel.html()}
    </div>
    <div id="b-main" class="b-main">
        <div id="entry-btn" class="b-main-item clickable">${icons.moonViewCeremony}</div>
        <div id="page-status" class="b-main-item" hidden>
            <span class="clickable" id="p-curr-page" style="color:#ffc005;">1</span><span id="p-slash-1">/</span><span id="p-total">0</span>
        </div>
        <div id="fin-status" class="b-main-item" hidden>
            <span>FIN:</span><span id="p-finished">0</span>
        </div>
        <div id="auto-page-btn" class="b-main-item clickable" hidden data-status="paused">
           <span>${i18n.autoPagePlay.get()}</span>
           <div id="auto-page-progress" style="z-index: -1; height: 100%; width: 0%; position: absolute; top: 0px; left: 0px; background-color: #cd8e8e;"></div>
        </div>
        <div id="config-panel-btn" class="b-main-item clickable" hidden>${i18n.config.get()}</div>
        <div id="downloader-panel-btn" class="b-main-item clickable" hidden>${i18n.download.get()}</div>
        <div id="chapters-btn" class="b-main-item clickable" hidden>${i18n.backChapters.get()}</div>
        <div id="read-mode-bar" class="b-main-item" hidden>
            <div id="read-mode-select"><span class="b-main-option clickable ${conf.readMode === "pagination" ? "b-main-option-selected" : ""}" data-value="pagination">PAGE</span><span class="b-main-option clickable ${conf.readMode === "continuous" ? "b-main-option-selected" : ""}" data-value="continuous">CONT</span></div>
        </div>
        <div id="pagination-adjust-bar" class="b-main-item" hidden>
            <span>
              <span id="paginationStepPrev" class="b-main-btn clickable" type="button">&lt;</span>
              <span id="paginationMinusBTN" class="b-main-btn clickable" type="button">-</span>
              <span id="paginationInput" class="b-main-input">${conf.paginationIMGCount}</span>
              <span id="paginationAddBTN" class="b-main-btn clickable" type="button">+</span>
              <span id="paginationStepNext" class="b-main-btn clickable" type="button">&gt;</span>
            </span>
        </div>
        <div id="scale-bar" class="b-main-item" hidden>
            <span>
              <span>${icons.zoomIcon}</span>
              <span id="scaleMinusBTN" class="b-main-btn clickable" type="button">-</span>
              <span id="scaleInput" class="b-main-input" style="width: 3rem; cursor: move;">${conf.imgScale}</span>
              <span id="scaleAddBTN" class="b-main-btn clickable" type="button">+</span>
            </span>
        </div>
    </div>
</div>
`;

  fullViewGrid.innerHTML = HTML_STRINGS;
  const styleSheel = loadStyleSheel();
  if (!conf.disableCssAnimation) {
    toggleAnimationStyle(conf.disableCssAnimation);
  }
  return {
    root: fullViewGrid,
    fullViewGrid: q("#ehvp-nodes-container", fullViewGrid),
    bigImageFrame: q("#big-img-frame", fullViewGrid),
    pageHelper: q("#p-helper", fullViewGrid),
    configPanelBTN: q("#config-panel-btn", fullViewGrid),
    downloaderPanelBTN: q("#downloader-panel-btn", fullViewGrid),
    entryBTN: q("#entry-btn", fullViewGrid),
    currPageElement: q("#p-curr-page", fullViewGrid),
    totalPageElement: q("#p-total", fullViewGrid),
    finishedElement: q("#p-finished", fullViewGrid),
    showGuideElement: q("#show-guide-element", fullViewGrid),
    showKeyboardCustomElement: q("#show-keyboard-custom-element", fullViewGrid),
    showExcludeURLElement: q("#show-exclude-url-element", fullViewGrid),
    showAutoOpenExcludeURLElement: q('#show-autoopen-exclude-url-element', fullViewGrid),
    imgLandLeft: q("#img-land-left", fullViewGrid),
    imgLandRight: q("#img-land-right", fullViewGrid),
    autoPageBTN: q("#auto-page-btn", fullViewGrid),
    pageLoading: q("#page-loading", fullViewGrid),
    config: new ConfigPanel(fullViewGrid),
    downloader: new DownloaderPanel(fullViewGrid),
    readModeSelect: q<HTMLDivElement>("#read-mode-select", fullViewGrid),
    paginationAdjustBar: q<HTMLDivElement>("#pagination-adjust-bar", fullViewGrid),
    styleSheel,
  };
}

export function addEventListeners(events: Events, HTML: Elements, BIFM: BigImageFrameManager, DL: Downloader, PH: PageHelper) {
  HTML.config.initEvents(events);

  HTML.configPanelBTN.addEventListener("click", () => events.togglePanelEvent("config", undefined, HTML.configPanelBTN));
  HTML.downloaderPanelBTN.addEventListener("click", () => {
    events.togglePanelEvent("downloader", undefined, HTML.downloaderPanelBTN);
    DL.check();
  });
  function collapsePanel(key: "config" | "downloader") {
    const elements = { "config": HTML.config.panel, "downloader": HTML.downloader.panel };
    conf.autoCollapsePanel && events.collapsePanelEvent(elements[key], key)
    if (BIFM.visible) {
      HTML.bigImageFrame.focus();
    } else {
      HTML.root.focus();
    }
  }
  HTML.config.panel.addEventListener("mouseleave", () => collapsePanel("config"));
  HTML.config.panel.addEventListener("blur", () => collapsePanel("config"));
  HTML.downloader.panel.addEventListener("mouseleave", () => collapsePanel("downloader"));
  HTML.downloader.panel.addEventListener("blur", () => collapsePanel("downloader"));

  let hovering = false;
  HTML.pageHelper.addEventListener("mouseover", () => {
    hovering = true;
    events.abortMouseleavePanelEvent();
    PH.minify(PH.lastStage, true);
  });
  HTML.pageHelper.addEventListener("mouseleave", () => {
    hovering = false;
    ["config", "downloader"].forEach(k => collapsePanel(k as "config" | "downloader"));
    setTimeout(() => !hovering && PH.minify(PH.lastStage, false), 700);
  });

  // entry 入口
  HTML.entryBTN.addEventListener("click", () => {
    let stage = HTML.entryBTN.getAttribute("data-stage") || "exit";
    stage = stage === "open" ? "exit" : "open";
    HTML.entryBTN.setAttribute("data-stage", stage);
    events.main(stage === "open");
  });

  const debouncer = new Debouncer();

  //全屏阅读元素滚动事件
  HTML.fullViewGrid.addEventListener("scroll", () => debouncer.addEvent("FULL-VIEW-SCROLL-EVENT", events.scrollEvent, 400));
  HTML.fullViewGrid.addEventListener("click", events.hiddenFullViewGridEvent);

  HTML.currPageElement.addEventListener("wheel", (event) => BIFM.stepNext(event.deltaY > 0 ? "next" : "prev", event.deltaY > 0 ? -1 : 1, parseInt(HTML.currPageElement.textContent!) - 1));

  // Shortcut
  document.addEventListener("keydown", (event) => events.keyboardEvent(event));
  HTML.fullViewGrid.addEventListener("keydown", (event) => {
    events.fullViewGridKeyBoardEvent(event)
    event.stopPropagation();
  });
  HTML.bigImageFrame.addEventListener("keydown", (event) => {
    events.bigImageFrameKeyBoardEvent(event);
    event.stopPropagation();
  });
  // 箭头导航
  HTML.imgLandLeft.addEventListener("click", (event) => {
    BIFM.stepNext(conf.reversePages ? "next" : "prev");
    event.stopPropagation();
  });
  HTML.imgLandRight.addEventListener("click", (event) => {
    BIFM.stepNext(conf.reversePages ? "prev" : "next");
    event.stopPropagation();
  });

  HTML.showGuideElement.addEventListener("click", events.showGuideEvent);
  HTML.showKeyboardCustomElement.addEventListener("click", events.showKeyboardCustomEvent);
  HTML.showExcludeURLElement.addEventListener("click", events.showExcludeURLEvent);
  HTML.showAutoOpenExcludeURLElement.addEventListener("click", events.showAutoOpenExcludeURLEvent);

  dragElement(HTML.pageHelper, {
    onFinish: () => {
      conf.pageHelperAbTop = HTML.pageHelper.style.top;
      conf.pageHelperAbLeft = HTML.pageHelper.style.left;
      conf.pageHelperAbBottom = HTML.pageHelper.style.bottom;
      conf.pageHelperAbRight = HTML.pageHelper.style.right;
      saveConf(conf);
    },
    onMoving: (pos) => {
      HTML.pageHelper.style.top = pos.top === undefined ? "unset" : `${pos.top}px`;
      HTML.pageHelper.style.bottom = pos.bottom === undefined ? "unset" : `${pos.bottom}px`;
      HTML.pageHelper.style.left = pos.left === undefined ? "unset" : `${pos.left}px`;
      HTML.pageHelper.style.right = pos.right === undefined ? "unset" : `${pos.right}px`;
      const rule = queryCSSRules(HTML.styleSheel, ".b-main");
      if (rule) rule.style.flexDirection = pos.left === undefined ? "row-reverse" : "row";

    }
  }, q("#dragHub", HTML.pageHelper));

  HTML.readModeSelect.addEventListener("click", (event) => {
    const value = (event.target as HTMLElement).getAttribute("data-value");
    if (value) {
      events.changeReadModeEvent(value);
      PH.minify(PH.lastStage);
    }
  });
  q("#paginationStepPrev", HTML.pageHelper).addEventListener("click", () => BIFM.stepNext(conf.reversePages ? "next" : "prev", conf.reversePages ? -1 : 1));
  q("#paginationStepNext", HTML.pageHelper).addEventListener("click", () => BIFM.stepNext(conf.reversePages ? "prev" : "next", conf.reversePages ? 1 : -1));
  q("#paginationMinusBTN", HTML.pageHelper).addEventListener("click", () => events.modNumberConfigEvent("paginationIMGCount", "minus"));
  q("#paginationAddBTN", HTML.pageHelper).addEventListener("click", () => events.modNumberConfigEvent("paginationIMGCount", "add"));
  q("#paginationInput", HTML.pageHelper).addEventListener("wheel", (event) => events.modNumberConfigEvent("paginationIMGCount", event.deltaY < 0 ? "add" : "minus"));

  q("#scaleInput", HTML.pageHelper).addEventListener("mousedown", (event) => {
    const element = event.target as HTMLElement;
    const scale = conf.imgScale || (conf.readMode === "pagination" ? 100 : 80);
    dragElementWithLine(event, element, { y: true }, (data) => {
      const fix = (data.direction & 3) === 1 ? 1 : -1; // 4bit: UDLR,  data.direction & 3 means remove UD
      BIFM.scaleBigImages(1, 0, Math.floor(scale + data.distance * 0.6 * fix));
      element.textContent = conf.imgScale.toString();
    });
  });
  q("#scaleMinusBTN", HTML.pageHelper).addEventListener("click", () => BIFM.scaleBigImages(-1, 10));
  q("#scaleAddBTN", HTML.pageHelper).addEventListener("click", () => BIFM.scaleBigImages(1, 10));
  q("#scaleInput", HTML.pageHelper).addEventListener("wheel", (event) => BIFM.scaleBigImages(event.deltaY > 0 ? -1 : 1, 5));
}

