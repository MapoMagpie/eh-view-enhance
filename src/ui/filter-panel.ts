import EBUS from "../event-bus";
import { Filter } from "../filter";
import q from "../utils/query-element";

export class FilterPanel {

  panel: HTMLElement;
  root: HTMLElement;
  filter: Filter;
  input: HTMLInputElement;
  list: HTMLUListElement;
  candidates: HTMLDivElement;
  candidatasFragment: DocumentFragment;
  candidateSelectIndex: number = 0;
  candidateCached: string[] = [];

  constructor(root: HTMLElement, filter: Filter) {
    this.root = root;
    this.panel = q("#filter-panel", root);
    this.input = q("#tag-input", this.panel);
    this.list = q("#tag-list", this.panel);
    this.candidates = q("#tag-candidates", this.panel);
    this.candidatasFragment = document.createDocumentFragment();
    this.filter = filter;
    this.input.addEventListener("click", () => EBUS.emit("filter-update-all-tags"));
    this.input.addEventListener("input", () => {
      this.candidateSelectIndex = 0;
      this.updateCandidates(false);
    });
    this.input.addEventListener("keyup", (ev) => {
      console.log("keypress ev: ", ev);
      if (ev.key.toLowerCase() === "arrowup") {
        this.candidateSelectIndex = this.candidateSelectIndex - 1;
        this.updateCandidates(true);
        ev.preventDefault();
      } else if (ev.key.toLowerCase() === "arrowdown") {
        this.candidateSelectIndex = this.candidateSelectIndex + 1;
        this.updateCandidates(true);
        ev.preventDefault();
      } else if (ev.key.toLowerCase() === "enter") {
        const tag = this.candidateCached[this.candidateSelectIndex];
        this.input.value = "";
        if (tag) {
          this.filter.push(true, tag);
          this.updateFilterValues();
        }
        this.candidates.hidden = true;
      }
    })
  }

  updateCandidates(noCache: boolean) {
    if (this.input.value.length === 0) {
      this.candidates.hidden = true;
      return;
    }
    const term = this.input.value.trim();
    // if (!term || term.length < 2) {
    //   this.candidates.hidden = true;
    //   return;
    // };
    if (!noCache) {
      this.candidateCached = [...this.filter.allTags].filter(t => !term || t.includes(term)); // TODO: fuzzy search
    }
    if (this.candidateCached.length > 500) {
      this.candidates.hidden = true;
      return;
    }
    this.candidateSelectIndex = Math.max(0, this.candidateSelectIndex);
    this.candidateSelectIndex = Math.min(this.candidateCached.length - 1, this.candidateSelectIndex);
    let selected: HTMLLIElement | undefined;
    for (let i = 0; i < this.candidateCached.length; i++) {
      const tag = this.candidateCached[i];
      const li = document.createElement("li");
      li.textContent = tag.toString();
      if (i === this.candidateSelectIndex) {
        li.classList.add("tc-selected");
        selected = li;
      }
      li.addEventListener("click", (ev) => {
        const tag = (ev.target as HTMLElement).textContent;
        if (!tag) return;
        this.input.value = "";
        this.filter.push(true, tag);
        this.updateFilterValues();
        this.candidates.hidden = true;
      });
      this.candidatasFragment.appendChild(li);
    }
    this.candidates.innerHTML = "";
    this.candidates.append(...Array.from(this.candidatasFragment.childNodes));
    this.candidates.hidden = false;
    selected?.scrollIntoView({ block: "center" });
  }

  updateFilterValues() {
    this.list.innerHTML = "";
    for (const tag of this.filter.values) {
      const li = document.createElement("li");
      li.textContent = tag.tag;
      li.addEventListener("click", (ev) => {
        const tag = (ev.target as HTMLElement).textContent;
        if (!tag) return;
        this.filter.remove(tag);
        this.updateFilterValues();
      })
      this.list.appendChild(li);
    }
  }

  static html() {
    return `
<div id="filter-panel" class="p-panel p-filter p-collapse">
    <div style="position: relative;">
      <input id="tag-input" class="tag-input" style="width:76%; margin-top:0.6em; margin-left: 12%;"/>
      <div id="tag-candidates" style="position:absolute; width:100%; min-height:1em; max-height:15em; overflow:auto; background-color:#444; margin-top:0; top:100%;" hidden="true"></div>
    </div>
    <div>
      <ul id="tag-list" class="tag-list">
      <span>Filter the images, unfinished!</span>
      </ul>
    </div>
</div>`;
  }
}

