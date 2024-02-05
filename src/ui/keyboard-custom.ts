import { i18n } from "../utils/i18n";
import { KeyboardEvents, KeyboardInBigImageModeId, KeyboardInFullViewGridId, KeyboardInMainId } from "./event";

export default function createKeyboardCustomPanel(keyboardEvents: KeyboardEvents, root: HTMLElement) {
  const HTML_STR = `
<div class="ehvp-custom-panel">
  <div class="ehvp-custom-panel-title">
    <span>Custom Keyboard</span>
    <span class="ehvp-custom-panel-close">✖</span>
  </div>
    <div class="ehvp-custom-panel-content">
  ${Object.entries(keyboardEvents.inMain).map(([id, desc]) => `
     <div class="ehvp-custom-panel-item">
      <div class="ehvp-custom-panel-item-title">
        <span>${i18n.keyboardCustom.inMain[id as KeyboardInMainId].get()}</span>
      </div>
      <div class="ehvp-custom-panel-item-values">
        ${desc.defaultKeys.map((key) => `<span id="${id}-span-item" class="ehvp-custom-panel-item-value"><span>${key}</span><button>x</button></span>`).join("")}
        <button class="ehvp-custom-panel-item-add-btn">+</button>
      </div>
     </div>
  `).join("")}
    </div>
    <div class="ehvp-custom-panel-content">
  ${Object.entries(keyboardEvents.inFullViewGrid).map(([id, desc]) => `
     <div class="ehvp-custom-panel-item">
      <div class="ehvp-custom-panel-item-title">
        <span>${i18n.keyboardCustom.inFullViewGrid[id as KeyboardInFullViewGridId].get()}</span>
      </div>
      <div class="ehvp-custom-panel-item-values">
        ${desc.defaultKeys.map((key) => `<span id="${id}-span-item" class="ehvp-custom-panel-item-value"><span>${key}</span><button>x</button></span>`).join("")}
        <button class="ehvp-custom-panel-item-add-btn">+</button>
      </div>
     </div>
  `).join("")}
    </div>
    <div class="ehvp-custom-panel-content">
  ${Object.entries(keyboardEvents.inBigImageMode).map(([id, desc]) => `
     <div class="ehvp-custom-panel-item">
      <div class="ehvp-custom-panel-item-title">
        <span>${i18n.keyboardCustom.inBigImageMode[id as KeyboardInBigImageModeId].get()}</span>
      </div>
      <div class="ehvp-custom-panel-item-values">
        ${desc.defaultKeys.map((key) => `<span id="${id}-span-item" class="ehvp-custom-panel-item-value"><span>${key}</span><button>x</button></span>`).join("")}
        <button class="ehvp-custom-panel-item-add-btn">+</button>
      </div>
     </div>
  `).join("")}
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
}
