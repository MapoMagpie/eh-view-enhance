import { ConfigBooleanKeys, ConfigBooleanType, ConfigNumberKeys, ConfigNumberType, ConfigSelectKeys, ConfigSelectType, conf } from "../config";
import { Downloader } from "../download/downloader";
import { IMGFetcherQueue } from "../fetcher-queue";
import { Debouncer } from "../utils/debouncer";
import { dragElement } from "../utils/drag-element";
import { i18n } from "../utils/i18n";
import { Events } from "./event";
import { loadStyleSheel } from "./style";
import { BigImageFrameManager } from "./ultra-image-frame-manager";


export type Elements = ReturnType<typeof createHTML>;

export function createHTML() {
  const fullViewPlane = document.createElement("div");
  fullViewPlane.setAttribute("tabindex", "0");
  fullViewPlane.classList.add("fullViewPlane");
  fullViewPlane.classList.add("collapse_full_view");
  document.body.after(fullViewPlane);

  const HTML_STRINGS = `
 <div id="bigImageFrame" class="bigImageFrame b-f-collapse" tabindex="0">
    <a id="imgLandLeft" hidden="true" class="imgLandLeft"></a>
    <a id="imgLandRight" hidden="true" class="imgLandRight"></a>
    <a id="imgLandTop" hidden="true" class="imgLandTop"></a>
    <a id="imgLandBottom" hidden="true" class="imgLandBottom"></a>
 </div>
 <div id="pageHelper" class="pageHelper">
     <div style="position: relative">
         <div id="configPlane" class="p-plane p-config p-collapse">
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
                     <span>${i18n.autoLoad.get()}
                        <span class="p-tooltip">?<span class="p-tooltiptext">${i18n.autoLoadTooltip.get()}</span></span>:
                     </span>
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
             <div style="grid-column-start: 1; grid-column-end: 4; padding-left: 5px;">
                 <label class="p-label">
                     <span>${i18n.dragToMove.get()}:</span>
                     <img id="dragHub" src="https://exhentai.org/img/xmpvf.png" style="cursor: move; width: 15px; object-fit: contain;" title="Drag This To Move The Bar">
                 </label>
             </div>
             <div style="grid-column-start: 4; grid-column-end: 8; padding-left: 5px;">
                  <a id="showGuideElement" class="clickable">HELP</a>
                  <a style="" class="github-button" href="https://github.com/MapoMagpie/eh-view-enhance" data-color-scheme="no-preference: dark; light: light; dark: dark;" data-icon="octicon-star" aria-label="Star MapoMagpie/eh-view-enhance on GitHub">Star</a>
             </div>
             <div id="imgScaleBar" class="p-img-scale" style="grid-column-start: 1; grid-column-end: 8; padding-left: 5px;">
                 <div><span>${i18n.imageScale.get()}:</span></div>
                 <div class="scale-status"><span id="imgScaleStatus">${conf.imgScale}%</span></div>
                 <div id="imgDecreaseBTN" class="scale-btn"><span>-</span></div>
                 <div id="imgScaleProgress" class="scale-progress"><div id="imgScaleProgressInner" class="scale-progress-inner" style="width: ${conf.imgScale}%"></div></div>
                 <div id="imgIncreaseBTN" class="scale-btn"><span>+</span></div>
                 <div id="imgScaleResetBTN" class="scale-btn"><span>RESET</span></div>
             </div>
         </div>
         <div id="downloaderPlane" class="p-plane p-downloader p-collapse">
             <div id="download-notice" class="download-notice"></div>
             <canvas id="downloaderCanvas" width="100" height="100"></canvas>
             <div class="download-btn-group">
                <a id="download-force" style="color: gray;" class="clickable">${i18n.forceDownload.get()}</a>
                <a id="download-start" style="color: rgb(120, 240, 80)" class="clickable">${i18n.downloadStart.get()}</a>
             </div>
         </div>
     </div>
     <div>
         <span id="gate">&lessdot;📖</span>
     </div>
     <div id="b-main" class="b-main b-collapse">
         <div id="configPlaneBTN" class="clickable">${i18n.config.get()}</div>
         <div id="downloaderPlaneBTN" class="clickable">${i18n.download.get()}</div>
         <div class="b-m-page">
             <span class="clickable" id="p-currPage"
                 style="color:orange;">1</span>/<span id="p-total">0</span>/<span>FIN:</span><span id="p-finished">0</span>
         </div>
         <div id="autoPageBTN" class="clickable" style="padding: 0rem 1rem; position: relative; border: 1px solid #777;">
            <span>${i18n.autoPagePlay.get()}</span>
            <div id="autoPageProgress" style="z-index: -1; height: 100%; width: 0%; position: absolute; top: 0px; left: 0px; background-color: #6a6a6a"></div>
         </div>
         <div id="collapseBTN" class="clickable">${i18n.collapse.get()}</div>
     </div>
     <div>
         <span>&gtdot;</span>
     </div>
 </div>
`;
  fullViewPlane.innerHTML = HTML_STRINGS;
  const styleSheel = loadStyleSheel();
  return {
    fullViewPlane,
    // root element
    bigImageFrame: fullViewPlane.querySelector<HTMLElement>("#bigImageFrame")!,
    // page helper
    pageHelper: fullViewPlane.querySelector<HTMLElement>("#pageHelper")!,
    // config button in pageHelper
    configPlaneBTN: fullViewPlane.querySelector<HTMLElement>("#configPlaneBTN")!,
    // config plane mouse leave event
    configPlane: fullViewPlane.querySelector<HTMLElement>("#configPlane")!,
    // download button in pageHelper
    downloaderPlaneBTN: fullViewPlane.querySelector<HTMLElement>("#downloaderPlaneBTN")!,
    // download plane mouse leave event
    downloaderPlane: fullViewPlane.querySelector<HTMLElement>("#downloaderPlane")!,
    collapseBTN: fullViewPlane.querySelector<HTMLElement>("#collapseBTN")!,
    gate: fullViewPlane.querySelector<HTMLElement>("#gate")!,
    currPageElement: fullViewPlane.querySelector<HTMLElement>("#p-currPage")!,
    totalPageElement: fullViewPlane.querySelector<HTMLElement>("#p-total")!,
    finishedElement: fullViewPlane.querySelector<HTMLElement>("#p-finished")!,
    showGuideElement: fullViewPlane.querySelector<HTMLElement>("#showGuideElement")!,
    imgLandLeft: fullViewPlane.querySelector<HTMLElement>("#imgLandLeft")!,
    imgLandRight: fullViewPlane.querySelector<HTMLElement>("#imgLandRight")!,
    imgLandTop: fullViewPlane.querySelector<HTMLElement>("#imgLandTop")!,
    imgLandBottom: fullViewPlane.querySelector<HTMLElement>("#imgLandBottom")!,
    imgScaleBar: fullViewPlane.querySelector<HTMLElement>("#imgScaleBar")!,
    autoPageBTN: fullViewPlane.querySelector<HTMLElement>("#autoPageBTN")!,
    styleSheel,
  };
}

export function addEventListeners(events: Events, HTML: Elements, BIFM: BigImageFrameManager, IFQ: IMGFetcherQueue, DL: Downloader) {
  HTML.configPlaneBTN.addEventListener("click", () => events.togglePlaneEvent("config"));
  HTML.configPlane.addEventListener("mouseleave", (event) => events.mouseleavePlaneEvent(event.target as HTMLElement));
  HTML.configPlane.addEventListener("blur", (event) => events.mouseleavePlaneEvent(event.target as HTMLElement));
  HTML.downloaderPlaneBTN.addEventListener("click", () => {
    DL.check();
    events.togglePlaneEvent("downloader");
  });
  HTML.downloaderPlane.addEventListener("mouseleave", (event) => events.mouseleavePlaneEvent(event.target as HTMLElement));
  HTML.downloaderPlane.addEventListener("blur", (event) => events.mouseleavePlaneEvent(event.target as HTMLElement));

  // modify config event
  for (const key of ConfigNumberKeys) {
    HTML.fullViewPlane.querySelector<HTMLButtonElement>(`#${key}MinusBTN`)!.addEventListener("click", () => events.modNumberConfigEvent(key as ConfigNumberType, 'minus'));
    HTML.fullViewPlane.querySelector<HTMLButtonElement>(`#${key}AddBTN`)!.addEventListener("click", () => events.modNumberConfigEvent(key as ConfigNumberType, 'add'));
    HTML.fullViewPlane.querySelector<HTMLInputElement>(`#${key}Input`)!.addEventListener("wheel", (event: WheelEvent) => {
      if (event.deltaY < 0) {
        events.modNumberConfigEvent(key as ConfigNumberType, 'add');
      } else if (event.deltaY > 0) {
        events.modNumberConfigEvent(key as ConfigNumberType, 'minus');
      }
    });
  }
  for (const key of ConfigBooleanKeys) {
    HTML.fullViewPlane.querySelector(`#${key}Checkbox`)!.addEventListener("input", () => events.modBooleanConfigEvent(key as ConfigBooleanType));
  }
  for (const key of ConfigSelectKeys) {
    HTML.fullViewPlane.querySelector(`#${key}Select`)!.addEventListener("change", () => events.modSelectConfigEvent(key as ConfigSelectType));
  }

  // entry 入口
  HTML.collapseBTN.addEventListener("click", () => events.main(false));
  HTML.gate.addEventListener("click", () => events.main(true));

  const debouncer = new Debouncer();

  //全屏阅读元素滚动事件
  HTML.fullViewPlane.addEventListener("scroll", () => debouncer.addEvent("FULL-VIEW-SCROLL-EVENT", events.scrollEvent, 200));
  HTML.fullViewPlane.addEventListener("click", events.hiddenFullViewPlaneEvent);

  HTML.currPageElement.addEventListener("click", () => BIFM.show());
  HTML.currPageElement.addEventListener("wheel", (event) => events.bigImageWheelEvent(event as WheelEvent));

  // Shortcut
  document.addEventListener("keydown", (event) => events.keyboardEvent(event));
  // 箭头导航
  HTML.imgLandLeft.addEventListener("click", (event) => {
    IFQ.stepImageEvent(conf.reversePages ? "next" : "prev");
    event.stopPropagation();
  });
  HTML.imgLandRight.addEventListener("click", (event) => {
    IFQ.stepImageEvent(conf.reversePages ? "prev" : "next");
    event.stopPropagation();
  });
  HTML.imgLandTop.addEventListener("click", (event) => {
    IFQ.stepImageEvent("prev");
    event.stopPropagation();
  });
  HTML.imgLandBottom.addEventListener("click", (event) => {
    IFQ.stepImageEvent("next");
    event.stopPropagation();
  });

  HTML.showGuideElement.addEventListener("click", events.showGuideEvent);

  dragElement(HTML.pageHelper, HTML.pageHelper.querySelector<HTMLElement>("#dragHub") ?? undefined, events.modPageHelperPostion);
}
