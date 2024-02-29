import { conf, saveConf } from "../config";
import { matchers } from "../platform/adapt";

export default function createExcludeURLPanel(root: HTMLElement) {
  const HTML_STR = `
<div class="ehvp-custom-panel">
  <div class="ehvp-custom-panel-title">
    <span>Exclude URL|Site</span>
    <span id="ehvp-custom-panel-close" class="ehvp-custom-panel-close">✖</span>
  </div>
    <div class="ehvp-custom-panel-content">
        <ul class="ehvp-custom-panel-list">
          ${matchers.map((m, index) => `
             <li data-index="${index}" class="ehvp-custom-panel-list-item ${conf.excludeURLs.indexOf(m.workURL().source) !== -1 ? "ehvp-custom-panel-list-item-disable" : ""}">
               <span>${m.workURL().source}</span>
             </li>
          `).join("")}
        </ul>
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

  const list = Array.from(fullPanel.querySelectorAll<HTMLButtonElement>(".ehvp-custom-panel-list-item"));
  list.forEach((li) => {
    const index = parseInt(li.getAttribute("data-index")!);
    li.addEventListener("click", () => {
      const i = conf.excludeURLs.indexOf(matchers[index].workURL().source);
      if (i === -1) {
        li.classList.add("ehvp-custom-panel-list-item-disable");
        conf.excludeURLs.push(matchers[index].workURL().source);
      } else {
        li.classList.remove("ehvp-custom-panel-list-item-disable");
        conf.excludeURLs.splice(i, 1);
      }
      saveConf(conf);
    });
  });
}
