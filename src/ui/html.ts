import { ConfigBooleanKeys, ConfigBooleanType, ConfigNumberKeys, ConfigNumberType, ConfigSelectKeys, ConfigSelectType, conf } from "../config";
import { Downloader } from "../download/downloader";
import { IMGFetcherQueue } from "../fetcher-queue";
import { Debouncer } from "../utils/debouncer";
import { dragElement } from "../utils/drag-element";
import { i18n } from "../utils/i18n";
import q from "../utils/query-element";
import { Events } from "./event";
import { loadStyleSheel } from "./style";
import { BigImageFrameManager } from "./ultra-image-frame-manager";


export type Elements = ReturnType<typeof createHTML>;

export function createHTML() {
  const fullViewGrid = document.createElement("div");
  // fullViewGrid.setAttribute("tabindex", "0");
  fullViewGrid.classList.add("ehvp-root");
  fullViewGrid.classList.add("ehvp-root-collapse");
  document.body.after(fullViewGrid);
  const HTML_STRINGS = `
<div id="page-loading" class="page-loading" style="display: none;">
    <div class="page-loading-text border-ani">Loading...</div>
</div>
<div id="ehvp-nodes-container" class="full-view-grid" tabindex="6"></div>
<div id="big-img-frame" class="big-img-frame big-img-frame-collapse" tabindex="7">
   <a id="img-land-left" class="img-land-left"></a>
   <a id="img-land-right" class="img-land-right"></a>
</div>
<div id="p-helper" class="p-helper">
    <div style="position: relative">
        <div id="config-panel" class="p-panel p-config p-collapse">
            <div style="grid-column-start: 1; grid-column-end: 7; padding-left: 5px;">
                <label class="p-label">
                    <span>${i18n.columns.get()}:</span>
                    <span>
                        <button id="colCountMinusBTN" class="p-btn" type="button">-</button>
                        <input id="colCountInput" value="${conf.colCount}" disabled type="text" />
                        <button id="colCountAddBTN" class="p-btn" type="button">+</button>
                    </span>
                </label>
            </div>
            <div style="grid-column-start: 1; grid-column-end: 7; padding-left: 5px;">
                <label class="p-label">
                    <span>${i18n.maxPreloadThreads.get()}
                       <span class="p-tooltip">?<span class="p-tooltiptext">${i18n.maxPreloadThreadsTooltip.get()}</span></span>:
                    </span>
                    <span>
                        <button id="threadsMinusBTN" class="p-btn" type="button">-</button>
                        <input id="threadsInput" value="${conf.threads}" disabled type="text" />
                        <button id="threadsAddBTN" class="p-btn" type="button">+</button>
                    </span>
                </label>
            </div>
            <div style="grid-column-start: 1; grid-column-end: 7; padding-left: 5px;">
                <label class="p-label">
                    <span>${i18n.maxDownloadThreads.get()}
                       <span class="p-tooltip">?<span class="p-tooltiptext">${i18n.maxDownloadThreadsTooltip.get()}</span></span>:
                    </span>
                    <span>
                        <button id="downloadThreadsMinusBTN" class="p-btn" type="button">-</button>
                        <input id="downloadThreadsInput" value="${conf.downloadThreads}" disabled type="text" />
                        <button id="downloadThreadsAddBTN" class="p-btn" type="button">+</button>
                    </span>
                </label>
            </div>
            <div style="grid-column-start: 1; grid-column-end: 7; padding-left: 5px;">
                <label class="p-label">
                    <span>${i18n.timeout.get()}:</span>
                    <span>
                        <button id="timeoutMinusBTN" class="p-btn" type="button">-</button>
                        <input id="timeoutInput" value="${conf.timeout}" disabled type="text" />
                        <button id="timeoutAddBTN" class="p-btn" type="button">+</button>
                    </span>
                </label>
            </div>
            <div style="grid-column-start: 1; grid-column-end: 4; padding-left: 5px;">
                <label class="p-label">
                    <span>${i18n.bestQuality.get()}
                       <span class="p-tooltip">?<span class="p-tooltiptext">${i18n.bestQualityTooltip.get()}</span></span>:
                    </span>
                    <input id="fetchOriginalCheckbox" ${conf.fetchOriginal ? "checked" : ""} type="checkbox" />
                </label>
            </div>
            <div style="grid-column-start: 4; grid-column-end: 7; padding-left: 5px;">
                <label class="p-label">
                    <span>${i18n.autoLoad.get()} :</span>
                    <input id="autoLoadCheckbox" ${conf.autoLoad ? "checked" : ""} type="checkbox" />
                </label>
            </div>
            <div style="grid-column-start: 1; grid-column-end: 4; padding-left: 5px;">
                <label class="p-label">
                    <span>${i18n.reversePages.get()}
                       <span class="p-tooltip">?<span class="p-tooltiptext">${i18n.reversePagesTooltip.get()}</span></span>:
                    </span>
                    <input id="reversePagesCheckbox" ${conf.reversePages ? "checked" : ""} type="checkbox" />
                </label>
            </div>
            <div style="grid-column-start: 4; grid-column-end: 7; padding-left: 5px;">
                <label class="p-label">
                    <span>${i18n.autoPlay.get()}
                       <span class="p-tooltip">?<span class="p-tooltiptext">${i18n.autoPlayTooltip.get()}</span></span>:
                    </span>
                    <input id="autoPlayCheckbox" ${conf.autoPlay ? "checked" : ""} type="checkbox" />
                </label>
            </div>
            <div style="grid-column-start: 1; grid-column-end: 7; padding-left: 5px;">
                <label class="p-label">
                    <span>${i18n.autoCollapsePanel.get()}
                       <span class="p-tooltip">?<span class="p-tooltiptext">${i18n.autoCollapsePanelTooltip.get()}</span></span>:
                    </span>
                    <input id="autoCollapsePanelCheckbox" ${conf.autoCollapsePanel ? "checked" : ""} type="checkbox" />
                </label>
            </div>
            <div style="grid-column-start: 1; grid-column-end: 7; padding-left: 5px;">
                <label class="p-label">
                    <span>${i18n.readMode.get()}
                       <span class="p-tooltip">?<span class="p-tooltiptext">${i18n.readModeTooltip.get()}</span></span>:
                    </span>
                    <select id="readModeSelect">
                       <option value="singlePage" ${conf.readMode == "singlePage" ? "selected" : ""}>Single Page</option>
                       <option value="consecutively" ${conf.readMode == "consecutively" ? "selected" : ""}>Consecutively</option>
                    </select>
                </label>
            </div>
            <div style="grid-column-start: 1; grid-column-end: 7; padding-left: 5px;">
                <label class="p-label">
                    <span>${i18n.stickyMouse.get()}
                       <span class="p-tooltip">?<span class="p-tooltiptext">${i18n.stickyMouseTooltip.get()}</span></span>:
                    </span>
                    <select id="stickyMouseSelect">
                       <option value="enable" ${conf.stickyMouse == "enable" ? "selected" : ""}>Enable</option>
                       <option value="reverse" ${conf.stickyMouse == "reverse" ? "selected" : ""}>Reverse</option>
                       <option value="disable" ${conf.stickyMouse == "disable" ? "selected" : ""}>Disable</option>
                    </select>
                </label>
            </div>
            <div style="grid-column-start: 1; grid-column-end: 7; padding-left: 5px;">
                <label class="p-label">
                    <span>${i18n.minifyPageHelper.get()} :</span>
                    <select id="minifyPageHelperSelect">
                       <option value="always" ${conf.minifyPageHelper == "always" ? "selected" : ""}>Always</option>
                       <option value="inBigMode" ${conf.minifyPageHelper == "inBigMode" ? "selected" : ""}>Big Mode</option>
                       <option value="never" ${conf.minifyPageHelper == "never" ? "selected" : ""}>Never</option>
                    </select>
                </label>
            </div>
            <div style="grid-column-start: 1; grid-column-end: 7; padding-left: 5px;">
                <label class="p-label">
                    <span>${i18n.autoPageInterval.get()}
                       <span class="p-tooltip">?<span class="p-tooltiptext">${i18n.autoPageIntervalTooltip.get()}</span></span>:
                    </span>
                    <span>
                        <button id="autoPageIntervalMinusBTN" class="p-btn" type="button">-</button>
                        <input id="autoPageIntervalInput" value="${conf.autoPageInterval}" disabled type="text" style="width: 4rem; line-height: 1rem;" />
                        <button id="autoPageIntervalAddBTN" class="p-btn" type="button">+</button>
                    </span>
                </label>
            </div>
            <div style="grid-column-start: 1; grid-column-end: 7; padding-left: 5px;">
                <label class="p-label">
                    <span>${i18n.preventScrollPageTime.get()}
                       <span class="p-tooltip">?<span class="p-tooltiptext">${i18n.preventScrollPageTimeTooltip.get()}</span></span>:
                    </span>
                    <span>
                        <button id="preventScrollPageTimeMinusBTN" class="p-btn" type="button">-</button>
                        <input id="preventScrollPageTimeInput" value="${conf.preventScrollPageTime}" disabled type="text" style="width: 4rem; line-height: 1rem;" />
                        <button id="preventScrollPageTimeAddBTN" class="p-btn" type="button">+</button>
                    </span>
                </label>
            </div>
            <div style="grid-column-start: 1; grid-column-end: 7; padding-left: 5px;">
                <label class="p-label">
                    <span>${i18n.dragToMove.get()}:</span>
                    <img id="dragHub" src="https://exhentai.org/img/xmpvf.png" style="cursor: move; width: 15px; object-fit: contain;" title="Drag This To Move The Bar">
                </label>
            </div>
            <div style="grid-column-start: 1; grid-column-end: 7; padding-left: 5px; text-align: left;">
                 <a id="show-guide-element" class="clickable" style="color: #fff; border: 1px dotted #fff; padding: 0px 3px;">${i18n.showHelp.get()}</a>
                 <a id="show-keyboard-custom-element" class="clickable" style="color: #fff; border: 1px dotted #fff; padding: 0px 3px;">${i18n.showKeyboard.get()}</a>
                 <a id="show-exclude-url-element" class="clickable" style="color: #fff; border: 1px dotted #fff; padding: 0px 3px;">${i18n.showExcludes.get()}</a>
                 <a class="clickable" style="color: #fff; border: 1px dotted #fff; padding: 0px 3px;" href="https://github.com/MapoMagpie/eh-view-enhance" target="_blank">${i18n.letUsStar.get()}</a>
            </div>
            <div id="img-scale-bar" class="p-img-scale" style="grid-column-start: 1; grid-column-end: 7; padding-left: 5px;">
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

export function addEventListeners(events: Events, HTML: Elements, BIFM: BigImageFrameManager, IFQ: IMGFetcherQueue, DL: Downloader) {
  HTML.configPanelBTN.addEventListener("click", () => events.togglePanelEvent("config"));
  HTML.downloaderPanelBTN.addEventListener("click", () => {
    DL.check();
    events.togglePanelEvent("downloader");
  });

  HTML.configPanel.addEventListener("mouseleave", (event) => conf.autoCollapsePanel && events.collapsePanelEvent(event.target as HTMLElement, "config"));
  HTML.configPanel.addEventListener("blur", (event) => conf.autoCollapsePanel && events.collapsePanelEvent(event.target as HTMLElement, "config"));
  HTML.downloaderPanel.addEventListener("mouseleave", (event) => conf.autoCollapsePanel && events.collapsePanelEvent(event.target as HTMLElement, "downloader"));
  HTML.downloaderPanel.addEventListener("blur", (event) => conf.autoCollapsePanel && events.collapsePanelEvent(event.target as HTMLElement, "downloader"));
  HTML.pageHelper.addEventListener("mouseover", () => conf.autoCollapsePanel && events.abortMouseleavePanelEvent(""));
  HTML.pageHelper.addEventListener("mouseleave", () => conf.autoCollapsePanel && ["config", "downloader"].forEach(k => events.togglePanelEvent(k, true)));

  // modify config event
  for (const key of ConfigNumberKeys) {
    q(`#${key}MinusBTN`, HTML.root).addEventListener("click", () => events.modNumberConfigEvent(key as ConfigNumberType, 'minus'));
    q(`#${key}AddBTN`, HTML.root).addEventListener("click", () => events.modNumberConfigEvent(key as ConfigNumberType, 'add'));
    q(`#${key}Input`, HTML.root).addEventListener("wheel", (event: WheelEvent) => {
      if (event.deltaY < 0) {
        events.modNumberConfigEvent(key as ConfigNumberType, 'add');
      } else if (event.deltaY > 0) {
        events.modNumberConfigEvent(key as ConfigNumberType, 'minus');
      }
    });
  }
  for (const key of ConfigBooleanKeys) {
    q(`#${key}Checkbox`, HTML.root).addEventListener("click", () => events.modBooleanConfigEvent(key as ConfigBooleanType));
  }
  for (const key of ConfigSelectKeys) {
    q(`#${key}Select`, HTML.root).addEventListener("change", () => events.modSelectConfigEvent(key as ConfigSelectType));
  }

  // entry 入口
  HTML.collapseBTN.addEventListener("click", () => events.main(false));
  HTML.gate.addEventListener("click", () => events.main(true));

  const debouncer = new Debouncer();

  //全屏阅读元素滚动事件
  HTML.fullViewGrid.addEventListener("scroll", () => debouncer.addEvent("FULL-VIEW-SCROLL-EVENT", events.scrollEvent, 400));
  HTML.fullViewGrid.addEventListener("click", events.hiddenFullViewGridEvent);

  HTML.currPageElement.addEventListener("click", () => BIFM.show());
  HTML.currPageElement.addEventListener("wheel", (event) => events.bigImageWheelEvent(event as WheelEvent));

  // Shortcut
  document.addEventListener("keydown", (event) => events.keyboardEvent(event));
  HTML.fullViewGrid.addEventListener("keydown", (event) => events.fullViewGridKeyBoardEvent(event));
  HTML.bigImageFrame.addEventListener("keydown", (event) => events.bigImageFrameKeyBoardEvent(event));
  // 箭头导航
  HTML.imgLandLeft.addEventListener("click", (event) => {
    IFQ.stepImageEvent(conf.reversePages ? "next" : "prev");
    event.stopPropagation();
  });
  HTML.imgLandRight.addEventListener("click", (event) => {
    IFQ.stepImageEvent(conf.reversePages ? "prev" : "next");
    event.stopPropagation();
  });

  HTML.showGuideElement.addEventListener("click", events.showGuideEvent);
  HTML.showKeyboardCustomElement.addEventListener("click", events.showKeyboardCustomEvent);
  HTML.showExcludeURLElement.addEventListener("click", events.showExcludeURLEvent);

  dragElement(HTML.pageHelper, q("#dragHub", HTML.pageHelper), events.modPageHelperPostion);
}
