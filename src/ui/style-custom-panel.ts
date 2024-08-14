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
<div class="ehvp-custom-panel" style="min-width:30vw;">
  <div class="ehvp-custom-panel-title">
    <span>${i18n.showStyleCustom.get()}</span>
    <span id="ehvp-custom-panel-close" class="ehvp-custom-panel-close">✖</span>
  </div>
  <div class="ehvp-custom-panel-container">
    <div class="ehvp-custom-panel-content">
      <div id="control-bar-example-container"></div>
      <div style="margin-top:1em;line-height:2em;">
        <input id="b-main-btn-custom-input" style="width: 30%;" type="text">
        <span id="b-main-btn-custom-confirm" class="ehvp-custom-btn ehvp-custom-btn-green">&nbspOk&nbsp</span>
        <span id="b-main-btn-custom-reset" class="ehvp-custom-btn ehvp-custom-btn-plain">&nbspReset&nbsp</span>
        <span id="b-main-btn-custom-preset1" class="ehvp-custom-btn ehvp-custom-btn-plain">&nbspPreset1&nbsp</span>
      </div>
      <div><span style="font-size:0.6em;color:#888;">${i18n.controlBarStyleTooltip.get()}</span></div>
    </div>
    <div class="ehvp-custom-panel-content" style="position:relative;">
      <div>
        <span class="ehvp-style-preset-btn ehvp-custom-btn ehvp-custom-btn-green" data-index="0">Preset 1</span>
        <span class="ehvp-style-preset-btn ehvp-custom-btn ehvp-custom-btn-green" data-index="1">Preset 2</span>
        <span class="ehvp-style-preset-btn ehvp-custom-btn ehvp-custom-btn-green" data-index="2">Preset 3</span>
        <span class="ehvp-style-preset-btn ehvp-custom-btn ehvp-custom-btn-green" data-index="3">Preset 4</span>
        <span class="ehvp-style-preset-btn ehvp-custom-btn ehvp-custom-btn-plain" data-index="99">Reset</span>
      </div>
      <textarea id="style-custom-input" style="width: 100%; height: 50vh;border:none;background-color:#00000090;color:#97ff97;text-align:left;vertical-align:top;font-size:1.2em;font-weight:600;">${conf.customStyle ?? ""}</textarea>
      <span style="position:absolute;bottom:2em;right:1em;" class="ehvp-custom-btn ehvp-custom-btn-green" id="style-custom-confirm">&nbspApply&nbsp</span>
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
  });

  const styleCustomInput = fullPanel.querySelector<HTMLTextAreaElement>("#style-custom-input")!;
  const styleCustomConfirm = fullPanel.querySelector<HTMLButtonElement>("#style-custom-confirm")!;
  styleCustomInput.addEventListener("keydown", (ev) => {
    if (ev.key === "Tab") {
      ev.preventDefault();
      const cursor = styleCustomInput.selectionStart;
      const left = styleCustomInput.value.slice(0, cursor);
      const right = styleCustomInput.value.slice(cursor);
      styleCustomInput.value = left + "  " + right;
      styleCustomInput.selectionStart = cursor + 2;
      styleCustomInput.selectionEnd = cursor + 2;
    }
  });

  const applyStyleCustom = (css: string) => {
    root.querySelector("#ehvp-style-custom")?.remove();
    const styleElement = document.createElement("style");
    styleElement.id = "ehvp-style-custom";
    conf.customStyle = css;
    styleElement.innerHTML = css;
    root.appendChild(styleElement);
    saveConf(conf);
  };

  styleCustomConfirm.addEventListener("click", () => applyStyleCustom(styleCustomInput.value));

  fullPanel.querySelectorAll(".ehvp-style-preset-btn").forEach(element => {
    element.addEventListener("click", () => {
      const index = parseInt(element.getAttribute("data-index") ?? "0");
      const css = stylePreset(index);
      styleCustomInput.value = css;
      applyStyleCustom(css);
    });
  })
}

function stylePreset(index: number) {
  const list = [
    `.ehvp-root {
  --ehvp-background-color: #29313dd1;
  --ehvp-fvg-background: #29313e;
  --ehvp-border: 1px solid #ffcd4d;
  --ehvp-font-color: #ffccae;
  --ehvp-img-fetched: #fff67a;
  --ehvp-img-failed: #f00;
  --ehvp-img-init: #ffffff;
  --ehvp-img-box-shadow: -3px 4px 4px 0px #000000;
  --ehvp-panel-border: 2px solid #000;
  --ehvp-panel-box-shadow: -2px -2px 3px #f3ff7e;
  font-size: 16px;
}
/* hide tooltips */
.p-tooltip {
  display: none;
}`,
    `.ehvp-root {
  --ehvp-background-color: #ebebeba0;
  --ehvp-fvg-background: #cccccc88;
  --ehvp-border: 1px solid #ff2ec9;
  --ehvp-font-color: #ff2ec9;
  --ehvp-img-fetched: #fba4fa;
  --ehvp-img-failed: #f00;
  --ehvp-img-init: #586b6c;
  --ehvp-img-box-shadow: -3px 4px 4px 0px #3d243d;
  --ehvp-panel-border: 2px solid #000;
  --ehvp-panel-box-shadow: -3px -3px 3px #3d243d;
  font-size: 16px;
}
/* hide tooltips */
.p-tooltip {
  display: none;
}`,
    `.ehvp-root {
  --ehvp-background-color: #29313e;
  --ehvp-fvg-background: #29313e;
  --ehvp-border: 1px solid #00000000;
  --ehvp-font-color: #ff5ec3;
  --ehvp-img-fetched: #fba4fa;
  --ehvp-img-failed: #f00;
  --ehvp-img-init: #586b6c;
  --ehvp-img-box-shadow: -3px 4px 4px 0px #ffffff00;
  --ehvp-panel-border: 2px solid #000;
  --ehvp-panel-box-shadow: -3px -3px 3px #ffffff00;
  font-size: 16px;
}
/* hide tooltips */
.p-tooltip {
  display: none;
}`,
    `.ehvp-root {
  --ehvp-background-color: #333366;
  --ehvp-border: 1px solid #333366;
  --ehvp-font-color: #eeeeee;
  --ehvp-img-fetched: #ffffff;
  --ehvp-img-failed: #f00;
  --ehvp-img-init: #29313e;
  --ehvp-img-box-shadow: none;
  --ehvp-panel-border: 2px solid #000;
  --ehvp-panel-box-shadow: -3px -3px 5px #ecb3ec;
  font-size: 16px;
  /* --ehvp-fvg-background: url('some image url here'); */
}
/* hide tooltips */
.p-tooltip {
  display: none;
}`,
  ];
  return list[index] ?? "";
}
