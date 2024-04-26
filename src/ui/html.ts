import { ConfigBooleanType, ConfigItem, ConfigItems, ConfigNumberType, ConfigSelectType, conf } from "../config";
import { Downloader } from "../download/downloader";
import { Debouncer } from "../utils/debouncer";
import { dragElement } from "../utils/drag-element";
import { I18nValue, i18n } from "../utils/i18n";
import q from "../utils/query-element";
import { Events } from "./event";
import { toggleAnimationStyle, loadStyleSheel } from "./style";
import { BigImageFrameManager } from "./ultra-image-frame-manager";

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
    <div style="position: relative">
        <div id="config-panel" class="p-panel p-config p-collapse">
            ${configItemStr}
            <div style="grid-column-start: 1; grid-column-end: 10; padding-left: 5px;">
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
            <div id="img-scale-bar" class="p-img-scale" style="grid-column-start: 1; grid-column-end: 11; padding-left: 5px;">
                <div><span>${i18n.imageScale.get()}:</span></div>
                <div class="scale-status"><span id="img-scale-status">${conf.imgScale}%</span></div>
                <div id="img-decrease-btn" class="scale-btn"><span>-</span></div>
                <div id="img-scale-progress" class="scale-progress"><div id="img-scale-progress-inner" class="scale-progress-inner" style="width: ${conf.imgScale}%"></div></div>
                <div id="img-increase-btn" class="scale-btn"><span>+</span></div>
                <div id="img-scale-reset-btn" class="scale-btn" style="width: auto;"><span>RESET</span></div>
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
    <div id="ehvp-gate-icon">
        <span>&lessdot;</span><span id="ehvp-gate-book">📖</span>
    </div>
    <div id="b-main" class="b-main b-collapse">
        <div id="config-panel-btn" class="clickable">${i18n.config.get()}</div>
        <div id="downloader-panel-btn" class="clickable">${i18n.download.get()}</div>
        <div class="b-m-page">
            <span class="clickable" id="p-curr-page" style="color:#ffc005;">1</span><span id="p-slash-1">/</span><span id="p-total">0</span><span id="p-slash-2">/</span><span>FIN:</span><span id="p-finished">0</span>
        </div>
        <div id="auto-page-btn" class="clickable" style="padding: 0rem 1rem; position: relative; border: 1px solid #777;">
           <span>${i18n.autoPagePlay.get()}</span>
           <div id="auto-page-progress" style="z-index: -1; height: 100%; width: 0%; position: absolute; top: 0px; left: 0px; background-color: #6a6a6a"></div>
        </div>
        <div id="collapse-btn" class="clickable">${i18n.collapse.get()}</div>
    </div>
    <div id="ehvp-bar-gtdot">
        <span>&gtdot;</span>
    </div>
    <div id="ehvp-p-extra" class="b-extra">
        <div id="backChaptersSelection" class="clickable" hidden="">${i18n.backChapters.get()}</div>
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
    // root element
    bigImageFrame: q("#big-img-frame", fullViewGrid),
    // page helper
    pageHelper: q("#p-helper", fullViewGrid),
    // config button in pageHelper
    configPanelBTN: q("#config-panel-btn", fullViewGrid),
    // config panel mouse leave event
    configPanel: q("#config-panel", fullViewGrid),
    // download button in pageHelper
    downloaderPanelBTN: q("#downloader-panel-btn", fullViewGrid),
    // download panel mouse leave event
    downloaderPanel: q("#downloader-panel", fullViewGrid),
    collapseBTN: q("#collapse-btn", fullViewGrid),
    gate: q("#ehvp-gate-icon", fullViewGrid),
    currPageElement: q("#p-curr-page", fullViewGrid),
    totalPageElement: q("#p-total", fullViewGrid),
    finishedElement: q("#p-finished", fullViewGrid),
    showGuideElement: q("#show-guide-element", fullViewGrid),
    showKeyboardCustomElement: q("#show-keyboard-custom-element", fullViewGrid),
    showExcludeURLElement: q("#show-exclude-url-element", fullViewGrid),
    imgLandLeft: q("#img-land-left", fullViewGrid),
    imgLandRight: q("#img-land-right", fullViewGrid),
    imgScaleBar: q("#img-scale-bar", fullViewGrid),
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
    styleSheel,
  };
}

export function addEventListeners(events: Events, HTML: Elements, BIFM: BigImageFrameManager, DL: Downloader) {
  HTML.configPanelBTN.addEventListener("click", () => events.togglePanelEvent("config"));
  HTML.downloaderPanelBTN.addEventListener("click", () => {
    events.togglePanelEvent("downloader");
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
  HTML.pageHelper.addEventListener("mouseover", () => events.abortMouseleavePanelEvent());
  HTML.pageHelper.addEventListener("mouseleave", () => ["config", "downloader"].forEach(k => collapsePanel(k as "config" | "downloader")));

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
  HTML.collapseBTN.addEventListener("click", () => events.main(false));
  HTML.gate.addEventListener("click", () => events.main(true));

  const debouncer = new Debouncer();

  //全屏阅读元素滚动事件
  HTML.fullViewGrid.addEventListener("scroll", () => debouncer.addEvent("FULL-VIEW-SCROLL-EVENT", events.scrollEvent, 400));
  HTML.fullViewGrid.addEventListener("click", events.hiddenFullViewGridEvent);

  HTML.currPageElement.addEventListener("wheel", (event) => BIFM.stepNext(event.deltaY > 0 ? "next" : "prev", parseInt((event.target as HTMLElement).textContent ?? "") - 1));

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

  dragElement(HTML.pageHelper, q("#dragHub", HTML.pageHelper), events.modPageHelperPostion);
}
