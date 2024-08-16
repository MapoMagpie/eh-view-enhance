import { ChapterStat, CherryPickRange } from "../download/downloader";
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
          q("#download-cherry-pick-input", this.cherryPickElement).focus();
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

  initNotice(btns: { btn: string, tooltip?: string, cb: () => void }[]) {
    this.noticeElement.innerHTML = "";
    btns.forEach(b => {
      // <a class='clickable' style='color:gray;'>Enable RawImage Transient</a>
      const a = document.createElement("a");
      a.textContent = b.btn;
      a.classList.add("clickable");
      a.style.color = "gray";
      a.style.margin = "0em 0.5em";
      a.addEventListener("click", b.cb);
      this.noticeElement.append(a);
    });
  }

  abort(stage: "downloadFailed" | "downloaded" | "downloadStart") {
    this.flushUI(stage);
    this.normalizeBTN();
  }

  flushUI(stage: "downloadFailed" | "downloaded" | "downloading" | "downloadStart" | "packaging") {
    this.startBTN.style.color = stage === "downloadFailed" ? "red" : "";
    this.startBTN.textContent = i18n[stage].get();
    this.btn.style.color = stage === "downloadFailed" ? "red" : "";
  }

  noticeableBTN() {
    if (!this.btn.classList.contains("lightgreen")) {
      this.btn.classList.add("lightgreen");
      if (!/✓/.test(this.btn.textContent!)) {
        this.btn.textContent += "✓";
      }
    }
  }

  normalizeBTN() {
    this.btn.textContent = this.btn.textContent!.replace("✓", "");
    this.btn.classList.remove("lightgreen");
  }

  createChapterSelectList(chapters: Chapter[], selectedChapters: ChapterStat[]) {
    const selectAll = chapters.length === 1;
    this.chaptersElement.innerHTML = `
<div>
  <span id="download-chapters-select-all" class="clickable">Select All</span>
  <span id="download-chapters-unselect-all" class="clickable">Unselect All</span>
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

  initCherryPick(onAdd: (chIndex: number, range: CherryPickRange) => CherryPickRange[] | null, onRemove: (chIndex: number, id: string) => void, onClear: (chIndex: number) => void, getRangeList: (chIndex: number) => CherryPickRange[] | null) {
    let chapterIndex = 0; // chapterIndex will be changed on event bus: pf-change-chapter
    function addRangeElements(container: HTMLElement, rangeList: CherryPickRange[], onRemove: (id: string) => void) {
      container.querySelectorAll(".ehvp-custom-panel-item-value").forEach(e => e.remove());
      const tamplate = document.createElement("div");
      rangeList.forEach(range => {
        const str = `<span class="ehvp-custom-panel-item-value" data-id="${range.id}"><span >${range.toString()}</span><span class="ehvp-custom-btn ehvp-custom-btn-plain" style="padding:0;border:none;">&nbspx&nbsp</span></span>`;
        tamplate.innerHTML = str;
        const element = tamplate.firstElementChild as HTMLElement;
        element.style.backgroundColor = range.positive ? "#7fef7b" : "#ffa975";
        container.appendChild(element);
        element.querySelector(".ehvp-custom-btn")!.addEventListener("click", (event) => {
          const parent = (event.target as HTMLElement).parentElement!;
          onRemove(parent.getAttribute("data-id")!);
          parent.remove();
        });
        tamplate.remove();
      });
    }
    const pickBTN = q<HTMLButtonElement>("#download-cherry-pick-btn-add", this.cherryPickElement);
    const excludeBTN = q<HTMLButtonElement>("#download-cherry-pick-btn-exclude", this.cherryPickElement);
    const clearBTN = q<HTMLButtonElement>("#download-cherry-pick-btn-clear", this.cherryPickElement);
    const rangeBeforeSpan = q<HTMLButtonElement>("#download-cherry-pick-btn-range-before", this.cherryPickElement);
    const rangeAfterSpan = q<HTMLButtonElement>("#download-cherry-pick-btn-range-after", this.cherryPickElement);
    const input = q<HTMLInputElement>("#download-cherry-pick-input", this.cherryPickElement);
    const addCherryPick = (exclude: boolean, range?: string) => {
      const rangeList = range ?
        [CherryPickRange.from((exclude ? "!" : "") + range)].filter(r => r !== null) as CherryPickRange[] :
        (input.value || "").split(",").map(s => (exclude ? "!" : "") + s).map(CherryPickRange.from).filter(r => r !== null) as CherryPickRange[];
      if (rangeList.length > 0) {
        rangeList.forEach(range => {
          const newList = onAdd(chapterIndex, range);
          if (newList === null) return;
          addRangeElements(this.cherryPickElement.firstElementChild as HTMLElement, newList, (id) => onRemove(chapterIndex, id))
        });
      }
      input.value = "";
      input.focus();
    }
    const clearPick = () => {
      onClear(chapterIndex);
      addRangeElements(this.cherryPickElement.firstElementChild as HTMLElement, [], (id) => onRemove(chapterIndex, id))
      input.value = "";
      input.focus();
    }
    pickBTN.addEventListener("click", () => addCherryPick(false));
    excludeBTN.addEventListener("click", () => addCherryPick(true));
    clearBTN.addEventListener("click", clearPick);
    this.cherryPickElement.querySelectorAll(".download-cherry-pick-follow-btn").forEach(btn => {
      const followBTNClick = () => {
        const step = parseInt(btn.getAttribute("data-sibling-step") || "1");
        let sibling = btn;
        for (let i = 0; i < step; i++) {
          sibling = sibling.previousElementSibling as HTMLElement;
        }
        if (step <= 1) {
          clearPick();
        }
        addCherryPick(step > 1, sibling.getAttribute("data-range") || undefined);
      }
      btn.addEventListener("click", followBTNClick);
    });

    input.addEventListener("keypress", (event) => event.key === "Enter" && addCherryPick(false));

    let lastIndex: number | undefined = 0;
    EBUS.subscribe("add-cherry-pick-range", (chIndex, index, positive, shiftKey) => {
      const range = new CherryPickRange([index + 1, shiftKey ? (lastIndex ?? index) + 1 : index + 1], positive);
      lastIndex = index;
      addRangeElements(this.cherryPickElement.firstElementChild as HTMLElement, onAdd(chIndex, range) || [], (id) => onRemove(chIndex, id));
    });
    EBUS.subscribe("pf-change-chapter", (index) => {
      if (index === -1) return;
      chapterIndex = index;
      addRangeElements(this.cherryPickElement.firstElementChild as HTMLElement, getRangeList(chapterIndex) || [], (id) => onRemove(chapterIndex, id));
    });
    let pad = 0;
    EBUS.subscribe("pf-on-appended", (total) => {
      pad = total.toString().length;
      const rAfter = rangeAfterSpan.getAttribute("data-range")!.split("-").map(v => v.padStart(pad, "0")).join("-");
      rangeAfterSpan.textContent = rAfter;
      rangeAfterSpan.setAttribute("data-range", rAfter);
      const rBefore = rangeBeforeSpan.getAttribute("data-range")!.split("-").map((v, i) => i === 1 ? total.toString() : v.padStart(pad, "0")).join("-")
      rangeBeforeSpan.textContent = rBefore;
      rangeBeforeSpan.setAttribute("data-range", rBefore);
    })
    EBUS.subscribe("ifq-do", (index) => {
      const rAfter = [1, index + 1].map(v => v.toString().padStart(pad, "0")).join("-");
      rangeAfterSpan.textContent = rAfter;
      rangeAfterSpan.setAttribute("data-range", rAfter);
      const rBefore = rangeBeforeSpan.getAttribute("data-range")!.split("-").map((v, i) => i === 0 ? (index + 1).toString().padStart(pad, "0") : v).join("-")
      rangeBeforeSpan.textContent = rBefore;
      rangeBeforeSpan.setAttribute("data-range", rBefore);
    });
  }


  static html() {
    return `
<div id="downloader-panel" class="p-panel p-downloader p-collapse">
    <div id="download-notice" class="download-notice" style="font-size: 0.7em;"></div>
    <div id="download-middle" class="download-middle">
      <div class="ehvp-tabs">
        <a id="download-tab-status" class="clickable ehvp-p-tab">${i18n.status.get()}</a>
        <a id="download-tab-cherry-pick" class="clickable ehvp-p-tab">${i18n.cherryPick.get()}</a>
        <a id="download-tab-chapters" class="clickable ehvp-p-tab">${i18n.selectChapters.get()}</a>
      </div>
      <div>
        <div id="download-status" class="download-status" hidden>
          <canvas id="downloader-canvas" width="0" height="0"></canvas>
        </div>
        <div id="download-cherry-pick" class="download-cherry-pick" hidden>
          <div class="ehvp-custom-panel-item-values" style="text-align: start;">
            <div style="margin-bottom: 1rem;display: flex;">
              <input type="text" class="ehvp-custom-panel-item-input" id="download-cherry-pick-input" placeholder="1, 2-3" style="text-align: start; width: 50%; height: 1.3rem; border-radius: 0px;" />
              <span class="ehvp-custom-btn ehvp-custom-btn-green" id="download-cherry-pick-btn-add">Pick</span>
              <span class="ehvp-custom-btn ehvp-custom-btn-plain" id="download-cherry-pick-btn-exclude">Exclude</span>
              <span class="ehvp-custom-btn ehvp-custom-btn-plain" id="download-cherry-pick-btn-clear">Clear</span>
            </div>
            <div style="margin-bottom: 1rem;">
              <div style="margin-bottom: 0.2rem">
                <span class="ehvp-custom-panel-item-span" id="download-cherry-pick-btn-range-after" data-range="1-1">1-1</span><span
                 class="ehvp-custom-btn ehvp-custom-btn-green download-cherry-pick-follow-btn" data-sibling-step="1">pick</span><span
                 class="ehvp-custom-btn ehvp-custom-btn-plain download-cherry-pick-follow-btn" data-sibling-step="2">exclude</span>
              </div>
              <div>
                <span class="ehvp-custom-panel-item-span" id="download-cherry-pick-btn-range-before" data-range="1-1">1-1</span><span
                class="ehvp-custom-btn ehvp-custom-btn-green download-cherry-pick-follow-btn" data-sibling-step="1">pick</span><span
                class="ehvp-custom-btn ehvp-custom-btn-plain download-cherry-pick-follow-btn" data-sibling-step="2">exclude</span>
              </div>
            </div>
          </div>
        </div>
        <div id="download-chapters" class="download-chapters" hidden></div>
      </div>
    </div>
    <div class="download-btn-group">
       <a id="download-force" class="clickable">${i18n.forceDownload.get()}</a>
       <a id="download-start" style="color: rgb(120, 240, 80)" class="clickable">${i18n.downloadStart.get()}</a>
    </div>
</div>`;
  }
}

