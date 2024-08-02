import { DisplayText, conf, getDisplayText, presetDisplayText, saveConf } from "../config";
import { i18n } from "../utils/i18n";
import icons from "../utils/icons";

function createControlBar() {
  const displayText = getDisplayText();
  return `
<div class="b-main" style="flex-direction:row;">
  <a class="b-main-item s-pickable" data-key="entry">${displayText.entry}</a>
  <a class="b-main-item s-pickable" data-key="collapse">${displayText.collapse}</a>
  <div class="b-main-item">
      <a class="" style="color:#ffc005;">1</a><span id="p-slash-1">/</span><span id="p-total">0</span>
  </div>
  <div class="b-main-item s-pickable" data-key="fin">
      <span>${displayText.fin}:</span><span id="p-finished">0</span>
  </div>
  <a class="b-main-item s-pickable" data-key="autoPagePlay" data-status="play">
     <span>${displayText.autoPagePlay}</span>
  </a>
  <a class="b-main-item s-pickable" data-key="autoPagePause" data-status="paused">
     <span>${displayText.autoPagePause}</span>
  </a>
  <a class="b-main-item s-pickable" data-key="config">${displayText.config}</a>
  <a class="b-main-item s-pickable" data-key="download">${displayText.download}</a>
  <a class="b-main-item s-pickable" data-key="chapters">${displayText.chapters}</a>
  <div class="b-main-item">
      <div id="read-mode-select"
      ><a class="b-main-option b-main-option-selected s-pickable" data-key="pagination" data-value="pagination">${displayText.pagination}</a
      ><a class="b-main-option s-pickable" data-key="continuous" data-value="continuous">${displayText.continuous}</a></div>
  </div>
  <div class="b-main-item">
      <span>
        <a class="b-main-btn" type="button">&lt;</a>
        <a class="b-main-btn" type="button">-</a>
        <span class="b-main-input">1</span>
        <a class="b-main-btn" type="button">+</a>
        <a class="b-main-btn" type="button">&gt;</a>
      </span>
  </div>
  <div class="b-main-item">
      <span>
        <span>${icons.zoomIcon}</span>
        <a class="b-main-btn" type="button">-</a>
        <span class="b-main-input" style="width: 3rem; cursor: move;">100</span>
        <a class="b-main-btn" type="button">+</a>
      </span>
  </div>
</div>`
}

export function createStyleCustomPanel(root: HTMLElement) {
  const HTML_STR = `
<div class="ehvp-custom-panel">
  <div class="ehvp-custom-panel-title">
    <span>${i18n.showStyleCustom.get()}</span>
    <span id="ehvp-custom-panel-close" class="ehvp-custom-panel-close">✖</span>
  </div>
  <div class="ehvp-custom-panel-container">
    <div class="ehvp-custom-panel-content">
      <div id="control-bar-example-container"></div>
      <div style="margin-top:1em;line-height:2em;">
        <input id="b-main-btn-custom-input" style="width: 30%;" type="text">
        <button id="b-main-btn-custom-confirm" class="ehvp-custom-btn-cover" style="background-color:#7fef7b;border:none;height:1.5em;">&nbspOk&nbsp</button>
        <button id="b-main-btn-custom-reset" class="ehvp-custom-btn-cover" style="background-color:#cfaf7b;border:none;height:1.5em;">&nbspReset&nbsp</button>
        <button id="b-main-btn-custom-preset1" class="ehvp-custom-btn-cover" style="background-color:#cfaf7b;border:none;height:1.5em;">&nbspPreset1&nbsp</button>
      </div>
    </div>
    <div class="ehvp-custom-panel-content">
      <input id="style-custom-input" style="width: 90%; height: 50vh;" type="textarea">
    </div>
  </div>
</div>
`;
  const fullPanel = document.createElement("div");
  fullPanel.classList.add("ehvp-full-panel");
  fullPanel.innerHTML = HTML_STR;
  fullPanel.addEventListener("click", (event) => {
    if ((event.target as HTMLElement).classList.contains("ehvp-full-panel")) {
      fullPanel.remove();
    }
  });
  root.appendChild(fullPanel);
  fullPanel.querySelector(".ehvp-custom-panel-close")!.addEventListener("click", () => fullPanel.remove());

  const controlBarContainer = fullPanel.querySelector("#control-bar-example-container")!;

  let pickedKey: keyof DisplayText | undefined = undefined;

  controlBarContainer.innerHTML = createControlBar();
  const initPickable = () => {
    Array.from(fullPanel.querySelectorAll(".s-pickable[data-key]")).forEach(element => {
      element.addEventListener("click", () => {
        pickedKey = element.getAttribute("data-key") as keyof DisplayText || undefined;
        btnCustomInput.value = "";
        if (pickedKey) btnCustomInput.focus();
      });
    });
  };
  initPickable();

  const btnCustomInput = fullPanel.querySelector<HTMLInputElement>("#b-main-btn-custom-input")!;
  const btnCustomConfirm = fullPanel.querySelector("#b-main-btn-custom-confirm")!;
  const btnCustomReset = fullPanel.querySelector("#b-main-btn-custom-reset")!;
  const btnCustomPreset1 = fullPanel.querySelector("#b-main-btn-custom-preset1")!;
  const confirm = () => {
    const value = btnCustomInput.value;
    btnCustomInput.value = "";
    if (!value || !pickedKey) return;
    conf.displayText[pickedKey] = value;
    saveConf(conf);
    controlBarContainer.innerHTML = createControlBar();
    initPickable();
  };
  btnCustomConfirm.addEventListener("click", confirm);
  btnCustomInput.addEventListener("keypress", (ev) => ev.key === "Enter" && confirm());
  btnCustomReset.addEventListener("click", () => {
    btnCustomInput.value = "";
    conf.displayText = {};
    saveConf(conf);
    controlBarContainer.innerHTML = createControlBar();
    initPickable();
  });
  btnCustomPreset1.addEventListener("click", () => {
    conf.displayText = presetDisplayText();
    saveConf(conf);
    controlBarContainer.innerHTML = createControlBar();
    initPickable();
  })
}
