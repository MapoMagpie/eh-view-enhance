import { GalleryMeta } from "../download/gallery-meta";
import ImageNode from "../img-node";
import { Chapter } from "../page-fetcher";
import { evLog } from "../utils/ev-log";
import { BaseMatcher, Result, OriginMeta } from "./platform";

// TODO: don't reference the md5 on the page, to avoid errors when the script is not loaded
function toMD5(s: string): string {
  // @ts-ignore
  return md5(s);
}

function get_num(gid: string, page: string): number {
  gid = window.atob(gid);
  page = window.atob(page);
  let n = toMD5(gid + page).slice(-1).charCodeAt(0);
  if (parseInt(gid) >= 268850 && parseInt(gid) <= 421925) {
    n %= 10;
  } else if (parseInt(gid) >= 421926) {
    n %= 8;
  }
  if (n < 10) {
    return 2 + (2 * n);
  } else {
    return 10;
  }
}

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
    const w = height - c * (m + 1) - l;
    0 == m ? c += l : g += l;
    ctx.drawImage(e, 0, w, r, c, 0, g, r, c);
  }
}

export class Comic18Matcher extends BaseMatcher<string> {
  name(): string {
    return "禁漫";
  }

  meta?: GalleryMeta;

  async fetchChapters(): Promise<Chapter[]> {
    const ret: Chapter[] = [];
    const thumb = document.querySelector<HTMLImageElement>(".thumb-overlay > img");
    const chapters = Array.from(document.querySelectorAll<HTMLAnchorElement>(".visible-lg .episode > ul > a"));
    if (chapters.length > 0) {
      chapters.forEach((ch, i) => {
        const title = Array.from(ch.querySelector("li")?.childNodes || []).map(n => n.textContent?.trim()).filter(Boolean).map(n => n!);
        const url = new URL(ch.href);
        url.searchParams.set("read_mode", "read-by-page");
        ret.push({
          id: i,
          title,
          source: url.href,
          queue: [],
          thumbimg: thumb?.src,
        });

      });
    } else {
      const first = document.querySelector(".visible-lg .read-block")?.firstElementChild as HTMLElement | undefined;
      if (first === undefined) throw new Error("No page found");
      let href = "";
      if (first instanceof HTMLAnchorElement) {
        href = first.href;
      } else {
        href = first.getAttribute("href") || "";
      }
      if (!href || href.startsWith("javascript")) throw new Error("未能找到阅读按钮！");
      if (href.startsWith("#coinbuycomic")) throw new Error("此漫画需要硬币解锁！请点击开始阅读按钮进行解锁。");
      const url = new URL(href);
      url.searchParams.set("read_mode", "read-by-page");
      ret.push({
        id: 0,
        title: "Default",
        source: url.href,
        queue: [],
      });
    }
    return ret;
  }

  async *fetchPagesSource(chapter: Chapter): AsyncGenerator<Result<string>> {
    yield Result.ok(chapter.source);
  }

  async parseImgNodes(source: string): Promise<ImageNode[]> {
    const list: ImageNode[] = [];
    const raw = await window.fetch(source as string).then(resp => resp.text());
    const document = new DOMParser().parseFromString(raw, "text/html");
    const elements = Array.from(document.querySelectorAll<HTMLImageElement>(".owl-carousel-page > .center > img"));
    for (const element of elements) {
      const src = element.getAttribute("data-src");
      if (!src) {
        evLog("error", "warn: cannot find img src", element);
        continue;
      }
      const title = src.split("/").pop()!;
      list.push(new ImageNode("", src, title, undefined, src));
    }
    return list;
  }

  async processData(data: Uint8Array, contentType: string, node: ImageNode): Promise<[Uint8Array, string]> {
    const reg = /(\d+)\/(\d+)\.(\w+)/;
    const matches = node.originSrc!.match(reg);
    const gid = matches![1];
    // let scrambleID: number = scramble_id;
    const scrambleID = 220980;
    if (Number(gid) < scrambleID) return [data, contentType];
    const page = matches![2];
    const ext = matches![3];
    if (ext === "gif") return [data, contentType];
    const img = await createImageBitmap(new Blob([data], { type: contentType }));
    const canvas = document.createElement("canvas");
    canvas.width = img.width;
    canvas.height = img.height;
    const ctx = canvas.getContext("2d")!;
    drawImage(ctx, img, gid, page);
    return new Promise(resolve =>
      canvas.toBlob(
        (blob) => blob?.arrayBuffer().then(buf => resolve([new Uint8Array(buf), blob.type])).finally(() => canvas.remove()),
        contentType
      )
    );
  }

  workURL(): RegExp {
    return /(18|jm)comic.*?\/album\/\d+/;
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
  async fetchOriginMeta(node: ImageNode): Promise<OriginMeta> {
    return { url: node.originSrc! };
  }
}
