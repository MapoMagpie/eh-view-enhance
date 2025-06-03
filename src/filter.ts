import { IMGFetcher } from "./img-fetcher";

export class Filter {
  values: FilterNode[] = [];
  allTags: Set<Tag> = new Set();
  onChange?: (filter: Filter) => void;
  filterNodes(imfs: IMGFetcher[], clearAllTags: boolean): IMGFetcher[] {
    let list = imfs;
    for (const val of this.values) {
      list = list.filter(imf => {
        for (const t of imf.node.tags) {
          if (t === val.tag) {
            return true;
          }
        }
        return false;
      });
    }
    if (clearAllTags) {
      this.allTags.clear();
    }
    list.forEach(imf => imf.node.tags.forEach(tag => this.allTags.add(tag)));
    return list;
  }
  push(exclude: boolean, tag: Tag) {
    const exists = this.values.find(v => v.tag === tag);
    if (exists) return;
    this.values.push({ exclude, tag });
    this.onChange?.(this);
  }
  remove(tag: Tag) {
    const index = this.values.findIndex(v => v.tag === tag);
    if (index > -1) {
      this.values.splice(index, 1);
      this.onChange?.(this);
    }
  }
  clear() {
    this.values = [];
    this.onChange?.(this);
  }
}

class FilterNode {
  exclude: boolean;
  tag: Tag;
  constructor(tag: Tag, exclude: boolean) {
    this.exclude = exclude;
    this.tag = tag;
  }
}

// export type TagCategory = "mime-type" | "misc" | "author" | "language" | string;

export type Tag = string;
