import { conf, saveConf } from "../config";
import { i18n } from "../utils/i18n";
import parseKey from "../utils/keyboard";
import { KeyboardDesc, KeyboardEvents, KeyboardInBigImageModeId, KeyboardInFullViewGridId, KeyboardInMainId } from "./event";

type Category = keyof typeof conf.keyboards;
type ID = KeyboardInBigImageModeId;
type IDKeys = { [key in ID]?: string[] }
type IDDesc = { [key in ID]: KeyboardDesc }


export default function createKeyboardCustomPanel(keyboardEvents: KeyboardEvents, root: HTMLElement) {

  function addKeyboardDescElement(button: HTMLElement, category: Category, id: ID, key: string) {
    const str = `<span data-id="${id}" data-key="${key}" class="ehvp-custom-panel-item-value"><span>${key}</span><span class="ehvp-custom-btn ehvp-custom-btn-plain" style="padding:0;border:none;">&nbspx&nbsp</span></span>`;
    const tamplate = document.createElement("div");
    tamplate.innerHTML = str;
    const element = tamplate.firstElementChild as HTMLElement;
    button.before(element);
    element.querySelector(".ehvp-custom-btn")!.addEventListener("click", (event) => {
      // try to remove key from conf
      const keys = (conf.keyboards[category] as IDKeys)[id];
      if (keys && keys.length > 0) {
        const index = keys.indexOf(key);
        if (index !== -1) keys.splice(index, 1);
        if (keys.length === 0) {
          delete (conf.keyboards[category] as IDKeys)[id];
        }
        saveConf(conf);
      }
      (event.target as HTMLElement).parentElement!.remove();
      // restore default keys
      const values = Array.from(button.parentElement!.querySelectorAll(".ehvp-custom-panel-item-value"));
      if (values.length === 0) {
        const desc = (keyboardEvents[category] as IDDesc)[id];
        desc.defaultKeys.forEach((key) => addKeyboardDescElement(button, category, id, key));
      }
    });
    tamplate.remove();
  }

  const HTML_STR = `
<div class="ehvp-custom-panel">
  <div class="ehvp-custom-panel-title">
    <span>${i18n.showKeyboard.get()}</span>
    <span id="ehvp-custom-panel-close" class="ehvp-custom-panel-close">✖</span>
  </div>
  <div class="ehvp-custom-panel-container">
    <div class="ehvp-custom-panel-content">
      ${Object.entries(keyboardEvents.inMain).map(([id]) => `
        <div class="ehvp-custom-panel-item">
         <div class="ehvp-custom-panel-item-title">
           <span>${i18n.keyboard.inMain[id as KeyboardInMainId].get()}</span>
         </div>
         <div class="ehvp-custom-panel-item-values">
           <!-- wait element created from button event -->
           <button class="ehvp-add-keyboard-btn ehvp-custom-btn ehvp-custom-btn-green" style="margin-left: 0.2em;" data-cate="inMain" data-id="${id}">+</button>
         </div>
        </div>
      `).join("")}
    </div>
    <div class="ehvp-custom-panel-content">
      ${Object.entries(keyboardEvents.inFullViewGrid).map(([id]) => `
        <div class="ehvp-custom-panel-item">
         <div class="ehvp-custom-panel-item-title">
           <span>${i18n.keyboard.inFullViewGrid[id as KeyboardInFullViewGridId].get()}</span>
         </div>
         <div class="ehvp-custom-panel-item-values">
           <!-- wait element created from button event -->
           <button class="ehvp-add-keyboard-btn ehvp-custom-btn ehvp-custom-btn-green" style="margin-left: 0.2em;" data-cate="inFullViewGrid" data-id="${id}">+</button>
         </div>
        </div>
      `).join("")}
    </div>
    <div class="ehvp-custom-panel-content">
      ${Object.entries(keyboardEvents.inBigImageMode).map(([id]) => `
        <div class="ehvp-custom-panel-item">
         <div class="ehvp-custom-panel-item-title">
           <span>${i18n.keyboard.inBigImageMode[id as KeyboardInBigImageModeId].get()}</span>
         </div>
         <div class="ehvp-custom-panel-item-values">
           <!-- wait element created from button event -->
           <button class="ehvp-add-keyboard-btn ehvp-custom-btn ehvp-custom-btn-green" style="margin-left: 0.2em;display:inline-block;" data-cate="inBigImageMode" data-id="${id}">+</button>
         </div>
        </div>
      `).join("")}
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
  fullPanel.querySelectorAll<HTMLElement>(".ehvp-add-keyboard-btn").forEach(button => {
    const category = button.getAttribute("data-cate") as Category;
    const id = button.getAttribute("data-id") as ID;
    let keys = (conf.keyboards[category] as IDKeys)[id];
    if (keys === undefined || keys.length === 0) {
      keys = (keyboardEvents[category] as IDDesc)[id].defaultKeys;
    }
    keys.forEach((key) => addKeyboardDescElement(button, category, id, key));
    const addKeyBoardDesc = (event: KeyboardEvent | MouseEvent) => {
      event.preventDefault();
      if (event instanceof KeyboardEvent) {
        if (event.key === "alt" || event.key === "shift" || event.key === "control") return;
      }
      const key = parseKey(event);
      if ((conf.keyboards[category] as IDKeys)[id] !== undefined) {
        (conf.keyboards[category] as IDKeys)[id]!.push(key);
      } else {
        (conf.keyboards[category] as IDKeys)[id] = keys!.concat(key);
      }
      saveConf(conf);
      addKeyboardDescElement(button, category, id, key);
      button.textContent = "+";
    };
    button.addEventListener("click", (event) => {
      event.preventDefault();
      button.textContent = "Press Key";
      button.addEventListener("keydown", addKeyBoardDesc, { once: true });
      button.addEventListener("mousedown", addKeyBoardDesc, { once: true });
    });
    button.addEventListener("mouseleave", () => {
      button.textContent = "+";
      button.removeEventListener("keydown", addKeyBoardDesc)
      button.removeEventListener("mousedown", addKeyBoardDesc);
    });
  });
}
