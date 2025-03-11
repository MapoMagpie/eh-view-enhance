import { DisplayText, IS_MOBILE, conf, getDisplayText, saveConf } from "../config";
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
      ><a class="b-main-option s-pickable" data-key="continuous" data-value="continuous">${displayText.continuous}</a
      ><a class="b-main-option s-pickable" data-key="horizontal" data-value="horizontal">${displayText.horizontal}</a></div>
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

export function createStyleCustomPanel(root: HTMLElement, onclose?: () => void) {
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
        <span id="b-main-btn-custom-preset2" class="ehvp-custom-btn ehvp-custom-btn-plain">&nbspPreset2&nbsp</span>
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
  const close = () => {
    fullPanel.remove();
    onclose?.();
  };
  fullPanel.addEventListener("click", (event) => {
    if ((event.target as HTMLElement).classList.contains("ehvp-full-panel")) {
      close();
    }
  });
  root.appendChild(fullPanel);
  fullPanel.querySelector(".ehvp-custom-panel-close")!.addEventListener("click", close);

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
  for (let i = 0; i < 2; i++) {
    const btnCustomPreset = fullPanel.querySelector(`#b-main-btn-custom-preset${i + 1}`)!;
    btnCustomPreset.addEventListener("click", () => {
      conf.displayText = displayTextPreset(i);
      saveConf(conf);
      controlBarContainer.innerHTML = createControlBar();
      initPickable();
    });
  }

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
  --ehvp-theme-bg-color: #393939db;
  --ehvp-theme-font-color: #fff;
  --ehvp-thumbnail-list-bg: #000000;
  --ehvp-thumbnail-border-size: 2px;
  --ehvp-thumbnail-border-radius: 0px;
  --ehvp-thumbnail-box-shadow: none;
  --ehvp-img-fetched: #95ff97;
  --ehvp-img-failed: red;
  --ehvp-img-init: #ffffff;
  --ehvp-img-fetching: #00000000;
  --ehvp-controlbar-border: none;
  --ehvp-panel-border: none;
  --ehvp-panel-box-shadow: none;
  --ehvp-big-images-gap: 0px;
  --ehvp-big-images-bg: #000000c4;
  --ehvp-clickable-color-hover: #90ea90;
  --ehvp-playing-progress-bar-color: #ffffffd0;
  ${IS_MOBILE ? "" : "font-size: 16px;"}
  font-family: Poppins,sans-serif;
}
/** override any style here, make the big image have a green border */
/**
.bifm-container > div {
  border: 2px solid green;
}
*/`,
    `.ehvp-root {
  --ehvp-theme-bg-color: #ffffff;
  --ehvp-theme-font-color: #760098;
  --ehvp-thumbnail-list-bg: #ffffff;
  --ehvp-thumbnail-border-size: 2px;
  --ehvp-thumbnail-border-radius: 4px;
  --ehvp-thumbnail-box-shadow: 0px 2px 2px 0px #785174;
  --ehvp-img-fetched: #d96cff;
  --ehvp-img-failed: red;
  --ehvp-img-init: #000000;
  --ehvp-img-fetching: #ffffff70;
  --ehvp-controlbar-border: 2px solid #760098;
  --ehvp-panel-border: 2px solid #760098;
  --ehvp-panel-box-shadow: none;
  --ehvp-big-images-gap: 0px;
  --ehvp-big-images-bg: #919191b0;
  --ehvp-clickable-color-hover: #ff87ba;
  --ehvp-playing-progress-bar-color: #760098d0;
  ${IS_MOBILE ? "" : "font-size: 16px;"}
  font-family: Poppins, sans-serif;
}`,
    `.ehvp-root {
  --ehvp-theme-bg-color: #000000c9;
  --ehvp-theme-font-color: #ffe637;
  --ehvp-thumbnail-list-bg: #000000;
  --ehvp-thumbnail-border-size: 2px;
  --ehvp-thumbnail-border-radius: 0px;
  --ehvp-thumbnail-box-shadow: none;
  --ehvp-img-fetched: #ffe637;
  --ehvp-img-failed: red;
  --ehvp-img-init: #fff;
  --ehvp-img-fetching: #00000000;
  --ehvp-controlbar-border: 2px solid #ffe637;
  --ehvp-panel-border: 2px solid #ffe637;
  --ehvp-panel-box-shadow: none;
  --ehvp-big-images-gap: 0px;
  --ehvp-big-images-bg: #000000d6;
  --ehvp-clickable-color-hover: #90ea90;
  --ehvp-playing-progress-bar-color: #ffe637d0;
  ${IS_MOBILE ? "" : "font-size: 16px;"}
  font-family: Poppins, sans-serif;
}`,
    `.ehvp-root {
  --ehvp-theme-bg-color: #ffffff;
  --ehvp-theme-font-color: #000000;
  --ehvp-thumbnail-list-bg: #ffffff;
  --ehvp-thumbnail-border-size: 2px;
  --ehvp-thumbnail-border-radius: 4px;
  --ehvp-thumbnail-box-shadow: 0px 2px 2px 0px #000000;
  --ehvp-img-fetched: #000000;
  --ehvp-img-failed: red;
  --ehvp-img-init: #ffffff;
  --ehvp-img-fetching: #ffffff70;
  --ehvp-controlbar-border: 2px solid #000000;
  --ehvp-panel-border: 2px solid #000000;
  --ehvp-panel-box-shadow: none;
  --ehvp-big-images-gap: 0px;
  --ehvp-big-images-bg: #919191b0;
  --ehvp-clickable-color-hover: #ff0000;
  --ehvp-playing-progress-bar-color: #000000d0;
  ${IS_MOBILE ? "" : "font-size: 16px;"}
  font-family: Poppins, sans-serif;
}`,
  ];
  return list[index] ?? "";
}

function displayTextPreset(index: number): DisplayText {
  const list: DisplayText[] = [
    {
      entry: "ENTER",
      collapse: "X",
      config: "C",
      download: "D",
      chapters: "CH.",
      fin: "F",
      pagination: "P",
      continuous: "C",
      horizontal: "H",
      autoPagePlay: "PLAY",
      autoPagePause: "PAUSE",
    },
    {
      entry: "<✿>",
      collapse: ">✴<",
      config: "☸",
      download: "⬇",
      chapters: "CH.",
      fin: "⬇",
      pagination: "❏",
      continuous: "⇅",
      horizontal: "⇆",
      autoPagePlay: "⊳",
      autoPagePause: "⇢⇢⇢",
    },
  ];
  return list[index] ?? {};
}
