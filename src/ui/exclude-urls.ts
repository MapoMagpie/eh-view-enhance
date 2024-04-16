import { conf, saveConf } from "../config";
import { matchers } from "../platform/adapt";

export default function createExcludeURLPanel(root: HTMLElement) {
  const workURLs = matchers.flatMap(m => m.workURLs()).map(r => r.source);
  const HTML_STR = `
<div class="ehvp-custom-panel">
  <div class="ehvp-custom-panel-title">
    <span>Exclude URL|Site</span>
    <span id="ehvp-custom-panel-close" class="ehvp-custom-panel-close">✖</span>
  </div>
    <div class="ehvp-custom-panel-content">
        <ul class="ehvp-custom-panel-list">
          ${workURLs.map((r, index) => `
             <li data-index="${index}" class="ehvp-custom-panel-list-item ${conf.excludeURLs.indexOf(r) !== -1 ? "ehvp-custom-panel-list-item-disable" : ""}">
               <span>${r}</span>
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
      const i = conf.excludeURLs.indexOf(workURLs[index]);
      if (i === -1) {
        li.classList.add("ehvp-custom-panel-list-item-disable");
        conf.excludeURLs.push(workURLs[index]);
      } else {
        li.classList.remove("ehvp-custom-panel-list-item-disable");
        conf.excludeURLs.splice(i, 1);
      }
      saveConf(conf);
    });
  });
}
