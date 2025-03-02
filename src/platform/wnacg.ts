import { GalleryMeta } from "../download/gallery-meta";
import ImageNode from "../img-node";
import { BaseMatcher, OriginMeta, Result } from "./platform";

export class WnacgMatcher extends BaseMatcher<Document> {
  name(): string {
    return "绅士漫画"
  }

  meta?: GalleryMeta;
  baseURL?: string;

  async *fetchPagesSource(): AsyncGenerator<Result<Document>> {
    const id = this.extractIDFromHref(window.location.href);
    if (!id) {
      throw new Error("Cannot find gallery ID");
    }
    this.baseURL = `${window.location.origin}/photos-index-page-1-aid-${id}.html`;
    let doc = await window.fetch(this.baseURL).then((res) => res.text()).then((text) => new DOMParser().parseFromString(text, "text/html"));
    this.meta = this.pasrseGalleryMeta(doc);
    yield Result.ok(doc);
    while (true) {
      const next = doc.querySelector<HTMLAnchorElement>(".paginator > .next > a");
      if (!next) break;
      const url = next.href;
      doc = await window.fetch(url).then((res) => res.text()).then((text) => new DOMParser().parseFromString(text, "text/html"));
      yield Result.ok(doc);
    }
  }

  async parseImgNodes(doc: Document): Promise<ImageNode[]> {
    const result: ImageNode[] = [];
    const list = Array.from(doc.querySelectorAll(".grid > .gallary_wrap > .cc > li"));
    for (const li of list) {
      const anchor = li.querySelector<HTMLAnchorElement>(".pic_box > a");
      if (!anchor) continue;
      const img = anchor.querySelector<HTMLImageElement>("img");
      if (!img) continue;
      const title = li.querySelector(".title > .name")?.textContent || "unknown";
      result.push(new ImageNode(img.src, anchor.href, title));
    }
    return result;
  }

  async fetchOriginMeta(node: ImageNode): Promise<OriginMeta> {
    const doc = await window.fetch(node.href).then((res) => res.text()).then((text) => new DOMParser().parseFromString(text, "text/html"));
    const img = doc.querySelector<HTMLImageElement>("#picarea")
    if (!img) throw new Error(`Cannot find #picarea from ${node.href}`);
    const url = img.src;
    const title = url.split("/").pop();
    return { url, title }
  }

  workURL(): RegExp {
    return /(wnacg.com|wn\d{2}.cc)\/photos-index/;
  }

  galleryMeta(doc: Document): GalleryMeta {
    return this.meta || super.galleryMeta(doc);
  }

  // https://www.hm19.lol/photos-index-page-1-aid-253297.html
  private extractIDFromHref(href: string): string | undefined {
    const match = href.match(/-(\d+).html$/);
    if (!match) return undefined;
    return match[1];
  }

  private pasrseGalleryMeta(doc: Document): GalleryMeta {
    const title = doc.querySelector<HTMLTitleElement>("#bodywrap > h2")?.textContent || "unknown";
    const meta = new GalleryMeta(this.baseURL || window.location.href, title);
    const tags = Array.from(doc.querySelectorAll(".asTB .tagshow")).map(ele => ele.textContent).filter(Boolean);
    const description = Array.from(doc.querySelector(".asTB > .asTBcell.uwconn > p")?.childNodes || []).map(e => e.textContent).filter(Boolean) as string[];
    meta.tags = { "tags": tags, "description": description }
    return meta;
  }

}
