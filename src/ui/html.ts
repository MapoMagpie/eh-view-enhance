import { conf } from "../config";
import { i18n } from "../utils/i18n";
import { loadStyleSheel } from "./style";


export function createHTML() {
  const fullViewPlane = document.createElement("div");
  fullViewPlane.classList.add("fullViewPlane");
  fullViewPlane.classList.add("collapse_full_view");
  document.body.appendChild(fullViewPlane);

  const HTML_STRINGS = `
 <div id="bigImageFrame" class="bigImageFrame collapse">
    <a id="imgLandLeft" hidden="true" class="imgLandLeft"></a>
    <a id="imgLandRight" hidden="true" class="imgLandRight"></a>
    <a id="imgLandTop" hidden="true" class="imgLandTop"></a>
    <a id="imgLandBottom" hidden="true" class="imgLandBottom"></a>
 </div>
 <div id="pageHelper" class="pageHelper">
     <div style="position: relative">
        <div id="imgScaleBar" class="plane p-img-scale" style="display: none;">
            <div><span>${i18n.imageScale.get()}:</span></div>
            <div class="scale-status"><span id="imgScaleStatus">${conf.imgScale}%</span></div>
            <div id="imgDecreaseBTN" class="scale-btn"><span>-</span></div>
            <div id="imgScaleProgress" class="scale-progress"><div id="imgScaleProgressInner" class="scale-progress-inner" style="width: ${conf.imgScale}%"></div></div>
            <div id="imgIncreaseBTN" class="scale-btn"><span>+</span></div>
            <div id="imgScaleResetBTN" class="scale-btn" style="width: 55px;"><span>RESET</span></div>
        </div>
         <div id="configPlane" class="plane p-config p-collapse">
             <div style="grid-column-start: 1; grid-column-end: 6; padding-left: 5px;">
                 <label>
                     <span>${i18n.columns.get()}:</span>
                     <span>
                         <button id="colCountMinusBTN" class="btn" type="button">-</button>
                         <input id="colCountInput" value="${conf.colCount}" disabled type="text" style="width: 15px;" />
                         <button id="colCountAddBTN" class="btn" type="button">+</button>
                     </span>
                 </label>
             </div>
             <div style="grid-column-start: 1; grid-column-end: 6; padding-left: 5px;">
                 <label>
                     <span>${i18n.maxPreloadThreads.get()}
                        <span class="tooltip">?<span class="tooltiptext">${i18n.maxPreloadThreadsTooltip.get()}</span></span>:
                     </span>
                     <span>
                         <button id="threadsMinusBTN" class="btn" type="button">-</button>
                         <input id="threadsInput" value="${conf.threads}" disabled type="text" style="width: 15px;" />
                         <button id="threadsAddBTN" class="btn" type="button">+</button>
                     </span>
                 </label>
             </div>
             <div style="grid-column-start: 1; grid-column-end: 6; padding-left: 5px;">
                 <label>
                     <span>${i18n.maxDownloadThreads.get()}
                        <span class="tooltip">?<span class="tooltiptext">${i18n.maxDownloadThreadsTooltip.get()}</span></span>:
                     </span>
                     <span>
                         <button id="downloadThreadsMinusBTN" class="btn" type="button">-</button>
                         <input id="downloadThreadsInput" value="${conf.downloadThreads}" disabled type="text" style="width: 15px;" />
                         <button id="downloadThreadsAddBTN" class="btn" type="button">+</button>
                     </span>
                 </label>
             </div>
             <div style="grid-column-start: 1; grid-column-end: 6; padding-left: 5px;">
                 <label>
                     <span>${i18n.timeout.get()}:</span>
                     <span>
                         <button id="timeoutMinusBTN" class="btn" type="button">-</button>
                         <input id="timeoutInput" value="${conf.timeout}" disabled type="text" style="width: 15px;" />
                         <button id="timeoutAddBTN" class="btn" type="button">+</button>
                     </span>
                 </label>
             </div>
             <div style="grid-column-start: 1; grid-column-end: 4; padding-left: 5px;">
                 <label>
                     <span>${i18n.bestQuality.get()}
                        <span class="tooltip">?<span class="tooltiptext">${i18n.bestQualityTooltip.get()}</span></span>:
                     </span>
                     <input id="fetchOriginalCheckbox" ${conf.fetchOriginal ? "checked" : ""} type="checkbox" style="height: 18px; width: 18px;" />
                 </label>
             </div>
             <div style="grid-column-start: 4; grid-column-end: 7; padding-left: 5px;">
                 <label>
                     <span>${i18n.autoLoad.get()}
                        <span class="tooltip">?<span class="tooltiptext">${i18n.autoLoadTooltip.get()}</span></span>:
                     </span>
                     <input id="autoLoadCheckbox" ${conf.autoLoad ? "checked" : ""} type="checkbox" style="height: 18px; width: 18px;" />
                 </label>
             </div>
             <div style="grid-column-start: 1; grid-column-end: 4; padding-left: 5px;">
                 <label>
                     <span>${i18n.reversePages.get()}
                        <span class="tooltip">?<span class="tooltiptext">${i18n.reversePagesTooltip.get()}</span></span>:
                     </span>
                     <input id="reversePagesCheckbox" ${conf.reversePages ? "checked" : ""} type="checkbox" style="height: 18px; width: 18px;" />
                 </label>
             </div>
             <div style="grid-column-start: 4; grid-column-end: 7; padding-left: 5px;">
                 <label>
                     <span>${i18n.autoPlay.get()}
                        <span class="tooltip">?<span class="tooltiptext">${i18n.autoPlayTooltip.get()}</span></span>:
                     </span>
                     <input id="autoPlayCheckbox" ${conf.autoPlay ? "checked" : ""} type="checkbox" style="height: 18px; width: 18px;" />
                 </label>
             </div>
             <div style="grid-column-start: 1; grid-column-end: 6; padding-left: 5px;">
                 <label>
                     <span>${i18n.readMode.get()}
                        <span class="tooltip">?<span class="tooltiptext">${i18n.readModeTooltip.get()}</span></span>:
                     </span>
                     <select id="readModeSelect" style="height: 18px; width: 130px; border-radius: 0px;">
                        <option value="singlePage" ${conf.readMode == "singlePage" ? "selected" : ""}>Single Page</option>
                        <option value="consecutively" ${conf.readMode == "consecutively" ? "selected" : ""}>Consecutively</option>
                     </select>
                 </label>
             </div>
             <div style="grid-column-start: 1; grid-column-end: 6; padding-left: 5px;">
                 <label>
                     <span>${i18n.stickyMouse.get()}
                        <span class="tooltip">?<span class="tooltiptext">${i18n.stickyMouseTooltip.get()}</span></span>:
                     </span>
                     <select id="stickyMouseSelect" style="height: 18px; width: 130px; border-radius: 0px;">
                        <option value="enable" ${conf.stickyMouse == "enable" ? "selected" : ""}>Enable</option>
                        <option value="reverse" ${conf.stickyMouse == "reverse" ? "selected" : ""}>Reverse</option>
                        <option value="disable" ${conf.stickyMouse == "disable" ? "selected" : ""}>Disable</option>
                     </select>
                 </label>
             </div>
             <div style="grid-column-start: 1; grid-column-end: 6; padding-left: 5px;">
                 <label>
                     <span>${i18n.autoPageInterval.get()}:</span>
                     <span>
                         <button id="autoPageIntervalMinusBTN" class="btn" type="button">-</button>
                         <input id="autoPageIntervalInput" value="${conf.autoPageInterval}" disabled type="text" style="width: 50px;" />
                         <button id="autoPageIntervalAddBTN" class="btn" type="button">+</button>
                     </span>
                 </label>
             </div>
             <div style="grid-column-start: 1; grid-column-end: 4; padding-left: 5px;">
                 <label>
                     <span>${i18n.dragToMove.get()}:</span>
                     <img id="dragHub" src="https://exhentai.org/img/xmpvf.png" style="cursor: move; width: 15px; object-fit: contain;" title="Drag This To Move The Bar">
                 </label>
             </div>
             <div style="grid-column-start: 4; grid-column-end: 8; padding-left: 5px;">
                  <a id="showGuideElement" class="clickable">HELP</a>
                  <a style="" class="github-button" href="https://github.com/MapoMagpie/eh-view-enhance" data-color-scheme="no-preference: dark; light: light; dark: dark;" data-icon="octicon-star" aria-label="Star MapoMagpie/eh-view-enhance on GitHub">Star</a>
             </div>
         </div>
         <div id="downloaderPlane" class="plane p-downloader p-collapse">
             <div id="download-notice" class="download-notice"></div>
             <canvas id="downloaderCanvas" width="337" height="250"></canvas>
             <div class="download-btn-group">
                <a id="download-force" style="color: gray;" class="clickable">${i18n.forceDownload.get()}</a>
                <a id="download-start" style="color: rgb(120, 240, 80)" class="clickable">${i18n.startDownload.get()}</a>
             </div>
         </div>
     </div>
     <div>
         <span id="gate" style="font-weight: 800; font-size: large; text-align: center; white-space: nowrap;">&lessdot;📖</span>
     </div>
     <!-- <span>展开</span> -->
     <div id="main" class="b-main b-collapse">
         <div id="configPlaneBTN" class="clickable">${i18n.config.get()}</div>
         <div id="downloaderPlaneBTN" class="clickable">${i18n.download.get()}</div>
         <div class="page">
             <span class="clickable" id="p-currPage"
                 style="color:orange;">1</span>/<span id="p-total">0</span>/<span>FIN:</span><span id="p-finished">0</span>
         </div>
         <div id="autoPageBTN" class="clickable" style="width: 70px; position: relative; border: 1px solid #777;">
            <span>${i18n.autoPagePlay.get()}</span>
            <div id="autoPageProgress" style="z-index: -1; height: 25px; width: 0%; position: absolute; top: 0px; left: 0px; background-color: #6a6a6a"></div>
         </div>
         <div id="collapseBTN" class="clickable">${i18n.collapse.get()}</div>
     </div>
     <div>
         <span style="font-weight: 800; font-size: large; text-align: center;">&gtdot;</span>
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
