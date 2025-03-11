import { i18n } from "../utils/i18n";

export default function createHelpPanel(root: HTMLElement, onclose?: () => void) {
  const HTML_STR = `
<div class="ehvp-custom-panel">
  <div class="ehvp-custom-panel-title">
    <span>${i18n.showHelp.get()}</span>
    <span id="ehvp-custom-panel-close" class="ehvp-custom-panel-close">✖</span>
  </div>
  <div class="ehvp-custom-panel-container ehvp-help-panel">
    <div class="ehvp-custom-panel-content">${i18n.help.get()}</div>
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
}
