import { ChapterStat } from "../download/downloader";
import EBUS from "../event-bus";
import { Chapter } from "../page-fetcher";
import { i18n } from "../utils/i18n";
import q from "../utils/query-element";

type TabID = "status" | "chapters" | "cherry-pick";

export class DownloaderPanel {

  panel: HTMLElement;
  canvas: HTMLCanvasElement;
  tabStatus: HTMLElement;
  tabChapters: HTMLElement;
  tabCherryPick: HTMLElement;
  statusElement: HTMLElement;
  chaptersElement: HTMLElement;
  cherryPickElement: HTMLElement;
  noticeElement: HTMLElement;
  forceBTN: HTMLAnchorElement;
  startBTN: HTMLAnchorElement;
  btn: HTMLElement

  constructor(root: HTMLElement) {
    this.btn = q("#downloader-panel-btn", root);
    this.panel = q("#downloader-panel", root);
    this.canvas = q<HTMLCanvasElement>("#downloader-canvas", root);
    this.tabStatus = q("#download-tab-status", root);
    this.tabChapters = q("#download-tab-chapters", root);
    this.tabCherryPick = q("#download-tab-cherry-pick", root);
    this.statusElement = q("#download-status", root);
    this.chaptersElement = q("#download-chapters", root);
    this.cherryPickElement = q("#download-cherry-pick", root);
    this.noticeElement = q("#download-notice", root);
    this.forceBTN = q<HTMLAnchorElement>("#download-force", root);
    this.startBTN = q<HTMLAnchorElement>("#download-start", root);
    this.panel.addEventListener("transitionend", () => EBUS.emit("downloader-canvas-resize"));
  }

  initTabs() {
    const elements = [this.statusElement, this.chaptersElement, this.cherryPickElement];
    const tabs = [
      {
        ele: this.tabStatus, cb: () => {
          elements.forEach((e, i) => e.hidden = i != 0)
          EBUS.emit("downloader-canvas-resize")
        }
      },
      {
        ele: this.tabChapters, cb: () => {
          elements.forEach((e, i) => e.hidden = i != 1)
        }
      },
      {
        ele: this.tabCherryPick, cb: () => {
          elements.forEach((e, i) => e.hidden = i != 2)
        }
      },
    ];
    tabs.forEach(({ ele, cb }, i) => {
      ele.addEventListener("click", () => {
        ele.classList.add("ehvp-p-tab-selected")
        tabs.filter((_, j) => j != i).forEach(t => t.ele.classList.remove("ehvp-p-tab-selected"));
        cb();
      });
    });
  }

  switchTab(tabID: TabID) {
    switch (tabID) {
      case "status":
        this.tabStatus.click();
        break;
      case "chapters":
        this.tabChapters.click();
        break;
      case "cherry-pick":
        this.tabCherryPick.click();
        break;
    }
  }

  noticeOriginal(cb: () => void) {
    this.noticeElement.innerHTML = `<span>${i18n.originalCheck.get()}</span>`;
    this.noticeElement.querySelector("a")?.addEventListener("click", cb);
  }

  abort(stage: "downloadFailed" | "downloaded" | "downloadStart") {
    this.flushUI(stage);
    this.normalizeBTN();
  }

  flushUI(stage: "downloadFailed" | "downloaded" | "downloading" | "downloadStart" | "packaging") {
    this.noticeElement.innerHTML = `<span>${i18n[stage].get()}</span>`;
    this.startBTN.style.color = stage === "downloadFailed" ? "red" : "";
    this.startBTN.textContent = i18n[stage].get();
    this.btn.style.color = stage === "downloadFailed" ? "red" : "";
  }

  noticeableBTN() {
    if (this.btn.classList.contains("lightgreen")) {
      this.btn.classList.add("lightgreen");
      if (!/✓/.test(this.btn.textContent!)) {
        this.btn.textContent += "✓";
      }
    }
  }

  normalizeBTN() {
    this.btn.textContent = i18n.download.get();
    this.btn.classList.remove("lightgreen");
  }

  createChapterSelectList(chapters: Chapter[], selectedChapters: ChapterStat[]) {
    const selectAll = chapters.length === 1;
    this.chaptersElement.innerHTML = `
<div>
  <span id="download-chapters-select-all" class="clickable p-btn">Select All</span>
  <span id="download-chapters-unselect-all" class="clickable p-btn">Unselect All</span>
</div>
${chapters.map((c, i) => `<div><label>
  <input type="checkbox" id="ch-${c.id}" value="${c.id}" ${selectAll || selectedChapters.find(sel => sel.index === i) ? "checked" : ""} />
  <span>${c.title}</span></label></div>`).join("")}
`;
    ([["#download-chapters-select-all", true], ["#download-chapters-unselect-all", false]] as [string, boolean][]).forEach(([id, checked]) =>
      this.chaptersElement.querySelector<HTMLInputElement>(id)?.addEventListener("click", () =>
        chapters.forEach(c => {
          const checkbox = this.chaptersElement.querySelector<HTMLInputElement>("#ch-" + c.id);
          if (checkbox) checkbox.checked = checked;
        })
      )
    );
  }

  selectedChapters() {
    const idSet = new Set<number>();
    this.chaptersElement.querySelectorAll<HTMLInputElement>("input[type=checkbox][id^=ch-]:checked")
      .forEach(checkbox => idSet.add(Number(checkbox.value)));
    return idSet;
  }


  static html() {
    return `
<div id="downloader-panel" class="p-panel p-downloader p-collapse">
    <div id="download-notice" class="download-notice"></div>
    <div id="download-middle" class="download-middle">
      <div class="ehvp-tabs">
        <a id="download-tab-status" class="clickable ehvp-p-tab">${i18n.status.get()}</a>
        <a id="download-tab-chapters" class="clickable ehvp-p-tab">${i18n.selectChapters.get()}</a>
        <a id="download-tab-cherry-pick" class="clickable ehvp-p-tab">${i18n.cherryPick.get()}</a>
      </div>
      <div>
        <div id="download-status" class="download-status" hidden>
          <canvas id="downloader-canvas" width="0" height="0"></canvas>
        </div>
        <div id="download-chapters" class="download-chapters" hidden></div>
        <div id="download-cherry-pick" class="download-cherry-pick" hidden>
          <div class="ehvp-custom-panel-item-values">
            <button class="ehvp-custom-panel-item-add-btn">+</button>
          </div>
        </div>
      </div>
    </div>
    <div class="download-btn-group">
       <a id="download-force" class="clickable">${i18n.forceDownload.get()}</a>
       <a id="download-start" style="color: rgb(120, 240, 80)" class="clickable">${i18n.downloadStart.get()}</a>
    </div>
</div>`;
  }
}

