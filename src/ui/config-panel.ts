import { ConfigBooleanType, ConfigItem, ConfigItems, ConfigNumberType, ConfigSelectType, conf } from "../config";
import { I18nValue, i18n } from "../utils/i18n";
import q from "../utils/query-element";
import relocateElement from "../utils/relocate-element";
import { Events } from "./event";

export class ConfigPanel {

  panel: HTMLElement;
  btn: HTMLElement;
  constructor(root: HTMLElement) {
    this.panel = q("#config-panel", root);
    this.btn = q("#config-panel-btn", root);
    // tooltip hovering
    this.panel.querySelectorAll<HTMLElement>(".p-tooltip").forEach(element => {
      const child = element.querySelector<HTMLElement>(".p-tooltiptext");
      if (!child) return;
      element.addEventListener("mouseenter", () => {
        child.style.display = "block";
        relocateElement(child, element, root.offsetWidth, root.offsetHeight);
      });
      element.addEventListener("mouseleave", () => child.style.display = "none");
    });
  }

  initEvents(events: Events) {
    // modify config event
    ConfigItems.forEach(item => {
      switch (item.typ) {
        case "number":
          q(`#${item.key}MinusBTN`, this.panel).addEventListener("click", () => events.modNumberConfigEvent(item.key as ConfigNumberType, 'minus'));
          q(`#${item.key}AddBTN`, this.panel).addEventListener("click", () => events.modNumberConfigEvent(item.key as ConfigNumberType, 'add'));
          q(`#${item.key}Input`, this.panel).addEventListener("wheel", (event: WheelEvent) => {
            event.preventDefault();
            if (event.deltaY < 0) {
              events.modNumberConfigEvent(item.key as ConfigNumberType, 'add');
            } else if (event.deltaY > 0) {
              events.modNumberConfigEvent(item.key as ConfigNumberType, 'minus');
            }
          });
          break;
        case "boolean":
          q(`#${item.key}Checkbox`, this.panel).addEventListener("click", () => events.modBooleanConfigEvent(item.key as ConfigBooleanType));
          break;
        case "select":
          q(`#${item.key}Select`, this.panel).addEventListener("change", () => events.modSelectConfigEvent(item.key as ConfigSelectType));
          break;
      }
    });
  }

  static html() {
    const configItemStr = ConfigItems.map(createOption).join("");
    return `
<div id="config-panel" class="p-panel p-config p-collapse">
    ${configItemStr}
    <div style="grid-column-start: 1; grid-column-end: 11; padding-left: 5px;">
        <label class="p-label">
            <span>${i18n.dragToMove.get()}:</span>
            <span id="dragHub" style="font-size: 1.85rem;cursor: grab;">✠</span>
        </label>
    </div>
    <div style="grid-column-start: 1; grid-column-end: 11; padding-left: 5px; text-align: left;">
         <a id="show-guide-element" class="clickable" style="border: 1px dotted #fff; padding: 0px 3px;">${i18n.showHelp.get()}</a>
         <a id="show-keyboard-custom-element" class="clickable" style="border: 1px dotted #fff; padding: 0px 3px;">${i18n.showKeyboard.get()}</a>
         <a id="show-site-profiles-element" class="clickable" style="border: 1px dotted #fff; padding: 0px 3px;">${i18n.showSiteProfiles.get()}</a>
         <a id="show-style-custom-element" class="clickable" style="border: 1px dotted #fff; padding: 0px 3px;">${i18n.showStyleCustom.get()}</a>
         <a id="reset-config-element" class="clickable" style="border: 1px dotted #fff; padding: 0px 3px;">${i18n.resetConfig.get()}</a>
         <a class="clickable" style="border: 1px dotted #fff; padding: 0px 3px;" href="https://github.com/MapoMagpie/eh-view-enhance" target="_blank">${i18n.letUsStar.get()}</a>
    </div>
</div>`;
  }
}

function createOption(item: ConfigItem) {
  const i18nKey = item.i18nKey || item.key;
  const i18nValue = (i18n as any)[i18nKey] as I18nValue;
  const i18nValueTooltip = (i18n as any)[`${i18nKey}Tooltip`] as I18nValue;
  if (!i18nValue) {
    throw new Error(`i18n key ${i18nKey} not found`);
  }
  let display = true;
  if (item.displayInSite) {
    display = item.displayInSite.test(location.href);
  }

  let input = "";
  switch (item.typ) {
    case "boolean":
      input = `<input id="${item.key}Checkbox" ${conf[item.key as ConfigBooleanType] ? "checked" : ""} type="checkbox" />`;
      break;
    case "number":
      input = `<span>
                  <button id="${item.key}MinusBTN" class="p-btn" type="button">-</button>
                  <input id="${item.key}Input" value="${conf[item.key as ConfigNumberType]}" disabled type="text" />
                  <button id="${item.key}AddBTN" class="p-btn" type="button">+</button></span>`;
      break;
    case "select":
      if (!item.options) {
        throw new Error(`options for ${item.key} not found`);
      }
      const optionsStr = item.options.map(o => `<option value="${o.value}" ${conf[item.key as ConfigSelectType] == o.value ? "selected" : ""}>${o.display}</option>`).join("");
      input = `<select id="${item.key}Select">${optionsStr}</select>`;
      break;
  }
  const [start, end] = item.gridColumnRange ? item.gridColumnRange : [1, 11];
  return `<div style="grid-column-start: ${start}; grid-column-end: ${end}; padding-left: 5px;${display ? "" : " display: none;"}"><label class="p-label"><span><span>${i18nValue.get()}</span><span class="p-tooltip">${i18nValueTooltip ? " ?:" : " :"}<span class="p-tooltiptext">${i18nValueTooltip?.get() || ""}</span></span></span>${input}</label></div>`;
}
