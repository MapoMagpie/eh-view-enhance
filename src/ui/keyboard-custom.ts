import { conf, saveConf } from "../config";
import { i18n } from "../utils/i18n";
import parseKey from "../utils/keyboard";
import { KeyboardDesc, KeyboardEvents, KeyboardInBigImageModeId, KeyboardInFullViewGridId, KeyboardInMainId } from "./event";

type Category = keyof typeof conf.keyboards;
type ID = KeyboardInBigImageModeId;
type IDKeys = { [key in ID]?: string[] }
type IDDesc = { [key in ID]: KeyboardDesc }


export default function createKeyboardCustomPanel(keyboardEvents: KeyboardEvents, root: HTMLElement) {

  function addKeyboardDescElement(btn: HTMLElement, category: Category, id: ID, key: string) {
    const str = `<span data-id="${id}" data-key="${key}" class="ehvp-custom-panel-item-value"><span >${key}</span><button>x</button></span>`;
    const tamplate = document.createElement("div");
    tamplate.innerHTML = str;
    const element = tamplate.firstElementChild as HTMLElement;
    btn.before(element);
    element.querySelector("button")!.addEventListener("click", (event) => {
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
      const values = Array.from(btn.parentElement!.querySelectorAll(".ehvp-custom-panel-item-value"));
      if (values.length === 0) {
        const desc = (keyboardEvents[category] as IDDesc)[id];
        desc.defaultKeys.forEach((key) => addKeyboardDescElement(btn, category, id, key));
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
           <span>${i18n.keyboardCustom.inMain[id as KeyboardInMainId].get()}</span>
         </div>
         <div class="ehvp-custom-panel-item-values">
           <!-- wait element created from button event -->
           <button class="ehvp-custom-panel-item-add-btn" data-cate="inMain" data-id="${id}">+</button>
         </div>
        </div>
      `).join("")}
    </div>
    <div class="ehvp-custom-panel-content">
      ${Object.entries(keyboardEvents.inFullViewGrid).map(([id]) => `
        <div class="ehvp-custom-panel-item">
         <div class="ehvp-custom-panel-item-title">
           <span>${i18n.keyboardCustom.inFullViewGrid[id as KeyboardInFullViewGridId].get()}</span>
         </div>
         <div class="ehvp-custom-panel-item-values">
           <!-- wait element created from button event -->
           <button class="ehvp-custom-panel-item-add-btn" data-cate="inFullViewGrid" data-id="${id}">+</button>
         </div>
        </div>
      `).join("")}
    </div>
    <div class="ehvp-custom-panel-content">
      ${Object.entries(keyboardEvents.inBigImageMode).map(([id]) => `
        <div class="ehvp-custom-panel-item">
         <div class="ehvp-custom-panel-item-title">
           <span>${i18n.keyboardCustom.inBigImageMode[id as KeyboardInBigImageModeId].get()}</span>
         </div>
         <div class="ehvp-custom-panel-item-values">
           <!-- wait element created from button event -->
           <button class="ehvp-custom-panel-item-add-btn" data-cate="inBigImageMode" data-id="${id}">+</button>
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
  const buttons = Array.from(fullPanel.querySelectorAll<HTMLButtonElement>(".ehvp-custom-panel-item-add-btn"));
  buttons.forEach((btn) => {
    const category = btn.getAttribute("data-cate") as Category;
    const id = btn.getAttribute("data-id") as ID;
    let keys = (conf.keyboards[category] as IDKeys)[id];
    if (keys === undefined || keys.length === 0) {
      keys = (keyboardEvents[category] as IDDesc)[id].defaultKeys;
    }
    keys.forEach((key) => addKeyboardDescElement(btn, category, id, key));

    const addKeyBoardDesc = (event: KeyboardEvent) => {
      event.preventDefault();
      if (event.key === "Alt" || event.key === "Shift" || event.key === "Control") return;
      const key = parseKey(event);
      if ((conf.keyboards[category] as IDKeys)[id] !== undefined) {
        (conf.keyboards[category] as IDKeys)[id]!.push(key);
      } else {
        (conf.keyboards[category] as IDKeys)[id] = keys!.concat(key);
      }
      saveConf(conf);
      addKeyboardDescElement(btn, category, id, key);
      btn.textContent = "+";
    };
    btn.addEventListener("click", () => {
      btn.textContent = "Press Key";
      btn.addEventListener("keydown", addKeyBoardDesc);
    });
    btn.addEventListener("mouseleave", () => {
      btn.textContent = "+";
      btn.removeEventListener("keydown", addKeyBoardDesc)
    });
  });
}
