import { conf } from "../config";
import { i18n } from "../utils/i18n";
import { loadStyleSheel } from "./style";


export function createHTML() {
    const fullViewPlane = document.createElement("div");
    fullViewPlane.classList.add("fullViewPlane");
    fullViewPlane.classList.add("collapse_full_view");
    document.body.after(fullViewPlane);

    const HTML_STRINGS = `
 <div id="bigImageFrame" class="bigImageFrame collapse">
    <a id="imgLandLeft" hidden="true" class="imgLandLeft"></a>
    <a id="imgLandRight" hidden="true" class="imgLandRight"></a>
    <a id="imgLandTop" hidden="true" class="imgLandTop"></a>
    <a id="imgLandBottom" hidden="true" class="imgLandBottom"></a>
    
 </div>
 <div id="pageHelper" class="pageHelper">
     <div style="position: relative">
         <div id="configPlane" class="plane p-config p-collapse">
             <div style="grid-column-start: 1; grid-column-end: 6; padding-left: 5px;">
                 <label style="display: flex; justify-content: space-between; padding-right: 10px;">
                     <span>${i18n.columns.get()}:</span>
                     <span>
                         <button id="colCountMinusBTN" type="button">-</button>
                         <input id="colCountInput" value="${conf.colCount}" disabled type="text" style="width: 15px;" />
                         <button id="colCountAddBTN" type="button">+</button>
                     </span>
                 </label>
             </div>
             <div style="grid-column-start: 1; grid-column-end: 6; padding-left: 5px;">
                 <label style="display: flex; justify-content: space-between; padding-right: 10px;">
                     <span>${i18n.maxPreloadThreads.get()}
                        <span class="tooltip"><span class="tooltiptext" style="width: 220px; left: -100px">${i18n.maxPreloadThreadsTooltip.get()}</span></span>:
                     </span>
                     <span>
                         <button id="threadsMinusBTN" type="button">-</button>
                         <input id="threadsInput" value="${conf.threads}" disabled type="text" style="width: 15px;" />
                         <button id="threadsAddBTN" type="button">+</button>
                     </span>
                 </label>
             </div>
             <div style="grid-column-start: 1; grid-column-end: 6; padding-left: 5px;">
                 <label style="display: flex; justify-content: space-between; padding-right: 10px;">
                     <span>${i18n.maxDownloadThreads.get()}
                        <span class="tooltip"><span class="tooltiptext" style="width: 200px; left: -100px">${i18n.maxDownloadThreadsTooltip.get()}</span></span>:
                     </span>
                     <span>
                         <button id="downloadThreadsMinusBTN" type="button">-</button>
                         <input id="downloadThreadsInput" value="${conf.downloadThreads}" disabled type="text" style="width: 15px;" />
                         <button id="downloadThreadsAddBTN" type="button">+</button>
                     </span>
                 </label>
             </div>
             <div style="grid-column-start: 1; grid-column-end: 6; padding-left: 5px;">
                 <label style="display: flex; justify-content: space-between; padding-right: 10px;">
                     <span>${i18n.timeout.get()}:</span>
                     <span>
                         <button id="timeoutMinusBTN" type="button">-</button>
                         <input id="timeoutInput" value="${conf.timeout}" disabled type="text" style="width: 15px;" />
                         <button id="timeoutAddBTN" type="button">+</button>
                     </span>
                 </label>
             </div>
             <div style="grid-column-start: 1; grid-column-end: 4; padding-left: 5px;">
                 <label>
                     <span>${i18n.bestQuality.get()}
                        <span class="tooltip"><span class="tooltiptext" style="width: 220px; left: -100px">${i18n.bestQualityTooltip.get()}</span></span>:
                     </span>
                     <input id="fetchOriginalCheckbox" ${conf.fetchOriginal ? "checked" : ""} type="checkbox" style="height: 18px; width: 18px;" />
                 </label>
             </div>
             <div style="grid-column-start: 4; grid-column-end: 7; padding-left: 5px;">
                 <label>
                     <span>${i18n.autoLoad.get()}
                        <span class="tooltip"><span class="tooltiptext" style="width: 200px; right:0;">${i18n.autoLoadTooltip.get()}</span></span>:
                     </span>
                     <input id="autoLoadCheckbox" ${conf.autoLoad ? "checked" : ""} type="checkbox" style="height: 18px; width: 18px;" />
                 </label>
             </div>
             <div style="grid-column-start: 1; grid-column-end: 7; padding-left: 5px;">
                 <label>
                     <span>${i18n.consecutiveMode.get()}
                        <span class="tooltip"><span class="tooltiptext" style="width: 220px; left:0;">${i18n.consecutiveModeTooltip.get()}</span></span>:
                     </span>
                     <input id="consecutiveModeCheckbox" ${conf.consecutiveMode ? "checked" : ""} type="checkbox" style="height: 18px; width: 18px;" />
                 </label>
             </div>
             <div style="grid-column-start: 1; grid-column-end: 4; padding-left: 5px;">
                 <label>
                     <span>${i18n.reversePages.get()}
                     </span>
                     <input id="reversePagesCheckbox" ${conf.reversePages ? "checked" : ""} type="checkbox" style="height: 18px; width: 18px;" />
                 </label>
             </div>
             <div style="grid-column-start: 1; grid-column-end: 2; padding-left: 5px;">
                  <a id="showGuideElement" class="clickable">Help</a>
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
         <span id="gate" style="font-weight: 800; font-size: large; text-align: center;">&lessdot;📖</span>
     </div>
     <!-- <span>展开</span> -->
     <div id="main" class="b-main b-collapse">
         <div id="configPlaneBTN" class="clickable" style="z-index: 1111;"> ${i18n.config.get()} </div>
         <div id="downloaderPlaneBTN" class="clickable" style="z-index: 1111;"> ${i18n.download.get()} </div>
         <div class="page">
             <span class="clickable" id="p-currPage"
                 style="color:orange;">1</span>/<span id="p-total">0</span>/<span>FIN:</span><span id="p-finished">0</span>
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
        pageHelper: fullViewPlane.querySelector("#pageHelper")!,
        // config button in pageHelper
        configPlaneBTN: fullViewPlane.querySelector("#configPlaneBTN")!,
        // config plane mouse leave event
        configPlane: fullViewPlane.querySelector("#configPlane")!,
        // download button in pageHelper
        downloaderPlaneBTN: fullViewPlane.querySelector("#downloaderPlaneBTN")!,
        // download plane mouse leave event
        downloaderPlane: fullViewPlane.querySelector("#downloaderPlane")!,
        collapseBTN: fullViewPlane.querySelector("#collapseBTN")!,
        gate: fullViewPlane.querySelector("#gate")!,
        currPageElement: fullViewPlane.querySelector("#p-currPage")!,
        totalPageElement: fullViewPlane.querySelector("#p-total")!,
        finishedElement: fullViewPlane.querySelector("#p-finished")!,
        showGuideElement: fullViewPlane.querySelector("#showGuideElement")!,
        imgLandLeft: fullViewPlane.querySelector("#imgLandLeft")!,
        imgLandRight: fullViewPlane.querySelector("#imgLandRight")!,
        imgLandTop: fullViewPlane.querySelector("#imgLandTop")!,
        imgLandBottom: fullViewPlane.querySelector("#imgLandBottom")!,
        styleSheel,
    };
}
