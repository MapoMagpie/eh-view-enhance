import { ConfigBooleanType, ConfigItem, ConfigItems, ConfigNumberType, ConfigSelectType, conf, saveConf } from "../config";
import { Downloader } from "../download/downloader";
import { Debouncer } from "../utils/debouncer";
import { dragElement, dragElementWithLine } from "../utils/drag-element";
import { I18nValue, i18n } from "../utils/i18n";
import q from "../utils/query-element";
import { Events } from "./event";
import { PageHelper } from "./page-helper";
import { toggleAnimationStyle, loadStyleSheel } from "./style";
import { BigImageFrameManager } from "./ultra-image-frame-manager";
import icons from "../utils/icons";
import queryCSSRules from "../utils/query-cssrules";

function createOption(item: ConfigItem) {
  const i18nKey = item.i18nKey || item.key;
  const i18nValue = (i18n as any)[i18nKey] as I18nValue;
  const i18nValueTooltip = (i18n as any)[`${i18nKey}Tooltip`] as I18nValue;
  if (!i18nValue) {
    throw new Error(`i18n key ${i18nKey} not found`);
  }
  let display = true;
  if (item.displayInSite) {
    display = item.displayInSite.test(location.href);
  }

  let input = "";
  switch (item.typ) {
    case "boolean":
      input = `<input id="${item.key}Checkbox" ${conf[item.key as ConfigBooleanType] ? "checked" : ""} type="checkbox" />`;
      break;
    case "number":
      input = `<span>
                  <button id="${item.key}MinusBTN" class="p-btn" type="button">-</button>
                  <input id="${item.key}Input" value="${conf[item.key as ConfigNumberType]}" disabled type="text" />
                  <button id="${item.key}AddBTN" class="p-btn" type="button">+</button></span>`;
      break;
    case "select":
      if (!item.options) {
        throw new Error(`options for ${item.key} not found`);
      }
      const optionsStr = item.options.map(o => `<option value="${o.value}" ${conf[item.key as ConfigSelectType] == o.value ? "selected" : ""}>${o.display}</option>`).join("");
      input = `<select id="${item.key}Select">${optionsStr}</select>`;
      break;
  }
  const [start, end] = item.gridColumnRange ? item.gridColumnRange : [1, 11];
  return `<div style="grid-column-start: ${start}; grid-column-end: ${end}; padding-left: 5px;${display ? "" : " display: none;"}"><label class="p-label"><span><span>${i18nValue.get()}</span><span class="p-tooltip">${i18nValueTooltip ? "?" : ""}<span class="p-tooltiptext">${i18nValueTooltip?.get() || ""}</span></span><span>:</span></span>${input}</label></div>`;
}

export type Elements = ReturnType<typeof createHTML>;

export function createHTML() {
  const fullViewGrid = document.createElement("div");
  fullViewGrid.classList.add("ehvp-root");
  fullViewGrid.classList.add("ehvp-root-collapse");
  document.body.after(fullViewGrid);
  const configItemStr = ConfigItems.map(createOption).join("");
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
        <div id="config-panel" class="p-panel p-config p-collapse">
            ${configItemStr}
            <div style="grid-column-start: 1; grid-column-end: 11; padding-left: 5px;">
                <label class="p-label">
                    <span>${i18n.dragToMove.get()}:</span>
                    <img id="dragHub" src="https://exhentai.org/img/xmpvf.png" style="cursor: move; width: 15px; object-fit: contain;" title="Drag This To Move The Bar">
                </label>
            </div>
            <div style="grid-column-start: 1; grid-column-end: 11; padding-left: 5px; text-align: left;">
                 <a id="show-guide-element" class="clickable" style="color: #fff; border: 1px dotted #fff; padding: 0px 3px;">${i18n.showHelp.get()}</a>
                 <a id="show-keyboard-custom-element" class="clickable" style="color: #fff; border: 1px dotted #fff; padding: 0px 3px;">${i18n.showKeyboard.get()}</a>
                 <a id="show-exclude-url-element" class="clickable" style="color: #fff; border: 1px dotted #fff; padding: 0px 3px;">${i18n.showExcludes.get()}</a>
                 <a class="clickable" style="color: #fff; border: 1px dotted #fff; padding: 0px 3px;" href="https://github.com/MapoMagpie/eh-view-enhance" target="_blank">${i18n.letUsStar.get()}</a>
            </div>
        </div>
        <div id="downloader-panel" class="p-panel p-downloader p-collapse">
            <div id="download-notice" class="download-notice"></div>
            <div id="download-middle" class="download-middle">
              <div class="ehvp-tabs">
                <a id="download-tab-dashboard" class="clickable ehvp-p-tab">Dashboard</a>
                <a id="download-tab-chapters" class="clickable ehvp-p-tab">Select Chapters</a>
              </div>
              <div>
                <div id="download-dashboard" class="download-dashboard" hidden>
                  <canvas id="downloader-canvas" width="0" height="0"></canvas>
                </div>
                <div id="download-chapters" class="download-chapters" hidden></div>
              </div>
            </div>
            <div class="download-btn-group">
               <a id="download-force" style="color: gray;" class="clickable">${i18n.forceDownload.get()}</a>
               <a id="download-start" style="color: rgb(120, 240, 80)" class="clickable">${i18n.downloadStart.get()}</a>
            </div>
        </div>
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
           <div id="auto-page-progress" style="z-index: -1; height: 100%; width: 0%; position: absolute; top: 0px; left: 0px; background-color: #6a6a6a"></div>
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
    configPanel: q("#config-panel", fullViewGrid),
    downloaderPanelBTN: q("#downloader-panel-btn", fullViewGrid),
    downloaderPanel: q("#downloader-panel", fullViewGrid),
    entryBTN: q("#entry-btn", fullViewGrid),
    currPageElement: q("#p-curr-page", fullViewGrid),
    totalPageElement: q("#p-total", fullViewGrid),
    finishedElement: q("#p-finished", fullViewGrid),
    showGuideElement: q("#show-guide-element", fullViewGrid),
    showKeyboardCustomElement: q("#show-keyboard-custom-element", fullViewGrid),
    showExcludeURLElement: q("#show-exclude-url-element", fullViewGrid),
    imgLandLeft: q("#img-land-left", fullViewGrid),
    imgLandRight: q("#img-land-right", fullViewGrid),
    autoPageBTN: q("#auto-page-btn", fullViewGrid),
    pageLoading: q("#page-loading", fullViewGrid),
    downloaderCanvas: q<HTMLCanvasElement>("#downloader-canvas", fullViewGrid),
    downloadTabDashboard: q("#download-tab-dashboard", fullViewGrid),
    downloadTabChapters: q("#download-tab-chapters", fullViewGrid),
    downloadDashboard: q("#download-dashboard", fullViewGrid),
    downloadChapters: q("#download-chapters", fullViewGrid),
    downloadNotice: q("#download-notice", fullViewGrid),
    downloadBTNForce: q<HTMLAnchorElement>("#download-force", fullViewGrid),
    downloadBTNStart: q<HTMLAnchorElement>("#download-start", fullViewGrid),
    readModeSelect: q<HTMLDivElement>("#read-mode-select", fullViewGrid),
    paginationAdjustBar: q<HTMLDivElement>("#pagination-adjust-bar", fullViewGrid),
    styleSheel,
  };
}

export function addEventListeners(events: Events, HTML: Elements, BIFM: BigImageFrameManager, DL: Downloader, PH: PageHelper) {
  HTML.configPanelBTN.addEventListener("click", () => events.togglePanelEvent("config", undefined, HTML.configPanelBTN));
  HTML.downloaderPanelBTN.addEventListener("click", () => {
    events.togglePanelEvent("downloader", undefined, HTML.downloaderPanelBTN);
    DL.check();
  });
  function collapsePanel(key: "config" | "downloader") {
    const elements = { "config": HTML.configPanel, "downloader": HTML.downloaderPanel };
    conf.autoCollapsePanel && events.collapsePanelEvent(elements[key], key)
  }
  HTML.configPanel.addEventListener("mouseleave", () => collapsePanel("config"));
  HTML.configPanel.addEventListener("blur", () => collapsePanel("config"));
  HTML.downloaderPanel.addEventListener("mouseleave", () => collapsePanel("downloader"));
  HTML.downloaderPanel.addEventListener("blur", () => collapsePanel("downloader"));
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

  // modify config event
  ConfigItems.forEach(item => {
    switch (item.typ) {
      case "number":
        q(`#${item.key}MinusBTN`, HTML.root).addEventListener("click", () => events.modNumberConfigEvent(item.key as ConfigNumberType, 'minus'));
        q(`#${item.key}AddBTN`, HTML.root).addEventListener("click", () => events.modNumberConfigEvent(item.key as ConfigNumberType, 'add'));
        q(`#${item.key}Input`, HTML.root).addEventListener("wheel", (event: WheelEvent) => {
          event.preventDefault();
          if (event.deltaY < 0) {
            events.modNumberConfigEvent(item.key as ConfigNumberType, 'add');
          } else if (event.deltaY > 0) {
            events.modNumberConfigEvent(item.key as ConfigNumberType, 'minus');
          }
        });
        break;
      case "boolean":
        q(`#${item.key}Checkbox`, HTML.root).addEventListener("click", () => events.modBooleanConfigEvent(item.key as ConfigBooleanType));
        break;
      case "select":
        q(`#${item.key}Select`, HTML.root).addEventListener("change", () => events.modSelectConfigEvent(item.key as ConfigSelectType));
        break;
    }
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

  HTML.currPageElement.addEventListener("wheel", (event) => BIFM.stepNext(event.deltaY > 0 ? "next" : "prev", -1));

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
  q("#paginationStepPrev", HTML.pageHelper).addEventListener("click", () => BIFM.stepNext(conf.reversePages ? "next" : "prev", -1));
  q("#paginationStepNext", HTML.pageHelper).addEventListener("click", () => BIFM.stepNext(conf.reversePages ? "prev" : "next", -1));
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
