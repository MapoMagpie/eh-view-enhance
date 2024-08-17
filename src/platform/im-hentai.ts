import { GalleryMeta } from "../download/gallery-meta";
import ImageNode from "../img-node";
import { PagesSource } from "../page-fetcher";
import q from "../utils/query-element";
import { BaseMatcher, OriginMeta } from "./platform";

export class IMHentaiMatcher extends BaseMatcher {
  name(): string {
    return "im-hentai";
  }
  data?: { server: string, uid: string, gid: string, imgDir: string, total: number };

  async fetchOriginMeta(node: ImageNode, _: boolean): Promise<OriginMeta> {
    const doc = await window.fetch(node.href).then((res) => res.text()).then((text) => new DOMParser().parseFromString(text, "text/html"));
    const imgNode = doc.querySelector<HTMLImageElement>("#gimg");
    if (!imgNode) {
      throw new Error("cannot find image node from: " + node.href);
    }
    const src = imgNode.getAttribute("data-src");
    if (!src) {
      throw new Error("cannot find image src from: #gimg");
    }
    // extract ext from url
    const ext = src.split(".").pop()?.match(/^\w+/)?.[0];
    // extract id from href
    const num = node.href.match(/\/(\d+)\/?$/)?.[1];
    let title: string | undefined;
    if (ext && num) {
      const digits = this.data!.total.toString().length;
      title = num.toString().padStart(digits, "0") + "." + ext;
    }
    return { url: src, title };
  }

  async parseImgNodes(): Promise<ImageNode[]> {
    if (!this.data) {
      throw new Error("impossibility");
    }
    const ret: ImageNode[] = [];
    const digits = this.data.total.toString().length;
    for (let i = 1; i <= this.data.total; i++) {
      // https://m8.imhentai.xxx/025/3qy10kv7dp/14t.jpg
      const url = `https://m${this.data.server}.imhentai.xxx/${this.data.imgDir}/${this.data.gid}/${i}t.jpg`;
      // /view/1219607/19/
      const href = `https://imhentai.xxx/view/${this.data.uid}/${i}/`;
      const node = new ImageNode(url, href, `${i.toString().padStart(digits, "0")}.jpg`);
      ret.push(node);
    }
    return ret;
  }

  async *fetchPagesSource(): AsyncGenerator<PagesSource> {
    const server = q<HTMLInputElement>("#load_server", document).value;
    const uid = q<HTMLInputElement>("#gallery_id", document).value;
    const gid = q<HTMLInputElement>("#load_id", document).value;
    const imgDir = q<HTMLInputElement>("#load_dir", document).value;
    const total = q<HTMLInputElement>("#load_pages", document).value;
    this.data = { server, uid, gid, imgDir, total: Number(total) };
    yield document;
  }

  galleryMeta(doc: Document): GalleryMeta {
    const title = doc.querySelector(".right_details > h1")?.textContent || undefined;
    const originTitle = doc.querySelector(".right_details > p.subtitle")?.textContent || undefined;
    const meta = new GalleryMeta(window.location.href, title || "UNTITLE");
    meta.originTitle = originTitle;
    meta.tags = {};
    const list = Array.from(doc.querySelectorAll<HTMLElement>(".galleries_info > li"));
    for (const li of list) {
      let cat = li.querySelector(".tags_text")?.textContent;
      if (!cat) continue;
      cat = cat.replace(":", "").trim();
      if (!cat) continue;
      const tags = Array.from(li.querySelectorAll("a.tag")).map(a => a.firstChild?.textContent?.trim()).filter(v => Boolean(v));
      meta.tags[cat] = tags;
    }
    return meta;
  }

  workURL(): RegExp {
    return /imhentai.xxx\/gallery\/\d+\//;
  }

}
