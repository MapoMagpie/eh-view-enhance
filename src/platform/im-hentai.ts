import { GalleryMeta } from "../download/gallery-meta";
import ImageNode from "../img-node";
import q from "../utils/query-element";
import { BaseMatcher, OriginMeta } from "./platform";

export class IMHentaiMatcher extends BaseMatcher<null> {
  name(): string {
    return "im-hentai";
  }
  data?: { server: string, uid: string, gid: string, imgDir: string, total: number };
  gth?: Record<string, string>;

  async fetchOriginMeta(node: ImageNode, _: boolean): Promise<OriginMeta> {
    return { url: node.originSrc! };
  }

  async parseImgNodes(): Promise<ImageNode[]> {
    if (!this.data || !this.gth) {
      throw new Error("impossibility");
    }
    const ret: ImageNode[] = [];
    const digits = this.data.total.toString().length;
    for (let i = 1; i <= this.data.total; i++) {
      const url = `https://m${this.data.server}.imhentai.xxx/${this.data.imgDir}/${this.data.gid}/${i}t.jpg`;
      const href = `https://imhentai.xxx/view/${this.data.uid}/${i}/`;
      const ext = imParseExt(this.gth[i.toString()]);
      const originSrc = `https://m${this.data.server}.imhentai.xxx/${this.data.imgDir}/${this.data.gid}/${i}.${ext}`;
      let wh = undefined;
      const splits = this.gth[i.toString()].split(",");
      if (splits.length === 3) {
        wh = { w: parseInt(splits[1]), h: parseInt(splits[2]) };
      }
      const node = new ImageNode(url, href, `${i.toString().padStart(digits, "0")}.${ext}`, undefined, originSrc, wh);
      ret.push(node);
    }
    return ret;
  }

  async *fetchPagesSource(): AsyncGenerator<null> {
    const server = q<HTMLInputElement>("#load_server", document).value;
    const uid = q<HTMLInputElement>("#gallery_id", document).value;
    const gid = q<HTMLInputElement>("#load_id", document).value;
    const imgDir = q<HTMLInputElement>("#load_dir", document).value;
    const total = q<HTMLInputElement>("#load_pages", document).value;
    this.data = { server, uid, gid, imgDir, total: Number(total) };
    const gthRaw = Array.from(document.querySelectorAll("script"))
      .find(s => s.textContent?.trimStart().startsWith("var g_th"))
      ?.textContent?.match(/\('(\{.*?\})'\)/)?.[1];
    if (!gthRaw) throw new Error("cannot match gallery images info");
    this.gth = JSON.parse(gthRaw) as Record<string, string>;
    yield null;
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

function imParseExt(str: string): string {
  switch (str.slice(0, 1)) {
    case "j": return "jpg";
    case "g": return "gif";
    case "p": return "png";
    case "w": return "webp";
    case "a": return "avif";
    case "m": return "mp4";
    default: throw new Error("cannot parse image extension from info: " + str);
  }
}
