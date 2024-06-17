import { conf, saveConf } from "../config";
import { getMatchers } from "../platform/adapt";

export default function createExcludeURLPanel(root: HTMLElement, urls: string[], autoOpen: boolean = false) {
  const workURLs = getMatchers().flatMap(m => m.workURLs()).map(r => r.source);
  const HTML_STR = `
<div class="ehvp-custom-panel">
  <div class="ehvp-custom-panel-title">
    <span>${autoOpen ? "Auto Open " : ""}Exclude URL|Site</span>
    <span id="ehvp-custom-panel-close" class="ehvp-custom-panel-close">✖</span>
  </div>
  <div class="ehvp-custom-panel-container">
    <div class="ehvp-custom-panel-content">
      <ul class="ehvp-custom-panel-list">
        ${workURLs.map((r, index) => `
           <li data-index="${index}" class="ehvp-custom-panel-list-item ${urls.indexOf(r) !== -1 ? "ehvp-custom-panel-list-item-disable" : ""}">
             <span>${r}</span>
           </li>
        `).join("")}
      </ul>
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

  const list = Array.from(fullPanel.querySelectorAll<HTMLButtonElement>(".ehvp-custom-panel-list-item"));
  list.forEach((li) => {
    const index = parseInt(li.getAttribute("data-index")!);
    li.addEventListener("click", () => {
      const i = urls.indexOf(workURLs[index]);
      if (i === -1) {
        li.classList.add("ehvp-custom-panel-list-item-disable");
        urls.push(workURLs[index]);
      } else {
        li.classList.remove("ehvp-custom-panel-list-item-disable");
        urls.splice(i, 1);
      }
      saveConf(conf);
    });
  });
}
