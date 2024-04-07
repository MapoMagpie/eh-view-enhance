import { GalleryMeta } from "../download/gallery-meta";
import ImageNode from "../img-node";
import { Chapter, PagesSource } from "../page-fetcher";
import { evLog } from "../utils/ev-log";
import { BaseMatcher, OriginMeta } from "./platform";

function drawImage(ctx: CanvasRenderingContext2D, e: ImageBitmap, gid: string, page: string) {
  const width = e.width;
  const height = e.height;
  //@ts-ignore
  const s = get_num(window.btoa(gid), window.btoa(page));
  const l = parseInt((height % s).toString());
  const r = width;
  for (let m = 0; m < s; m++) {
    let c = Math.floor(height / s);
    let g = c * m;
    let w = height - c * (m + 1) - l;
    0 == m ? c += l : g += l,
      ctx.drawImage(e, 0, w, r, c, 0, g, r, c)
  }
}

export class Comic18Matcher extends BaseMatcher {

  meta?: GalleryMeta;

  async fetchChapters(): Promise<Chapter[]> {
    const ret: Chapter[] = [];
    const thumb = document.querySelector<HTMLImageElement>(".thumb-overlay > img");
    // const toDoc = async (url: string) => await window.fetch(url).then((res) => res.text()).then((text) => new DOMParser().parseFromString(text, "text/html")).catch(() => null);
    const chapters = Array.from(document.querySelectorAll<HTMLAnchorElement>(".visible-lg .episode > ul > a"));
    if (chapters.length > 0) {
      chapters.forEach((ch, i) => {
        const title = Array.from(ch.querySelector("li")?.childNodes || []).map(n => n.textContent?.trim()).filter(Boolean).map(n => n!);
        ret.push({
          id: i,
          title,
          source: ch.href,
          queue: [],
          thumbimg: thumb?.src,
        });

      });
    } else {
      const href = document.querySelector<HTMLAnchorElement>(".read-block > a")?.href;
      if (href === undefined) throw new Error("No page found");
      ret.push({
        id: 0,
        title: "Default",
        source: href,
        queue: [],
      });
    }
    return ret;
  }

  async *fetchPagesSource(chapter: Chapter): AsyncGenerator<PagesSource> {
    yield chapter.source;
  }

  async parseImgNodes(source: PagesSource): Promise<ImageNode[]> {
    const list: ImageNode[] = [];
    const raw = await window.fetch(source as string).then(resp => resp.text());
    const document = new DOMParser().parseFromString(raw, "text/html");
    const elements = Array.from(document.querySelectorAll<HTMLDivElement>(".scramble-page:not(.thewayhome)"));
    for (const element of elements) {
      const title = element.id;
      const img = element.querySelector("img");
      if (!img) {
        evLog("error", "warn: cannot find img element", element);
        continue;
      }
      const src = img.getAttribute("data-original");
      if (!src) {
        evLog("error", "warn: cannot find data-original", element);
        continue;
      }
      list.push(new ImageNode("", src, title));
    }
    return list;
  }

  async processData(data: Uint8Array, contentType: string, url: string): Promise<Uint8Array> {
    const reg = /(\d+)\/(\d+)\.(\w+)/;
    const matches = url.match(reg);
    const gid = matches![1];
    //@ts-ignore
    let scrambleID: number = scramble_id;
    if (gid < scrambleID.toString()) return data;
    const page = matches![2];
    const ext = matches![3];
    if (ext === "gif") return data;
    const img = await createImageBitmap(new Blob([data], { type: contentType }));
    const canvas = document.createElement("canvas");
    canvas.width = img.width;
    canvas.height = img.height;
    const ctx = canvas.getContext("2d")!;
    drawImage(ctx, img, gid, page);
    return new Promise((resolve) => {
      canvas.toBlob((blob) => blob?.arrayBuffer().then(buf => new Uint8Array(buf)).then(resolve).finally(() => canvas.remove()), contentType);
    });
  }

  workURL(): RegExp {
    return /18comic.(vip|org)\/album\/\d+/;
  }

  galleryMeta(doc: Document): GalleryMeta {
    if (this.meta) return this.meta;
    const title = doc.querySelector(".panel-heading h1")?.textContent || "UNTITLE";
    this.meta = new GalleryMeta(window.location.href, title);
    this.meta.originTitle = title;
    const tagTrList = doc.querySelectorAll<HTMLElement>("div.tag-block > span");
    const tags: Record<string, string[]> = {};
    tagTrList.forEach((tr) => {
      const cat = tr.getAttribute("data-type")?.trim();
      if (cat) {
        const values = Array.from(tr.querySelectorAll("a")).map(a => a.textContent!).filter(Boolean);
        if (values.length > 0) {
          tags[cat] = values;
        }
      }
    });
    this.meta.tags = tags;
    return this.meta;
  }
  // https://cdn-msp.18comic.org/media/photos/529221/00004.gif
  async fetchOriginMeta(url: string): Promise<OriginMeta> {
    return { url };
  }
}
