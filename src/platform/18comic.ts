import { GalleryMeta } from "../download/gallery-meta";
import ImageNode from "../img-node";
import { evLog } from "../utils/ev-log";
import { Matcher, OriginMeta, PagesSource } from "./platform";

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

export class Comic18Matcher implements Matcher {

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
  public parseGalleryMeta(doc: Document): GalleryMeta {
    const title = doc.querySelector(".panel-heading h1")?.textContent || "UNTITLE";
    const meta = new GalleryMeta(window.location.href, title);
    meta.originTitle = title;
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
    meta.tags = tags;
    return meta;
  }
  // https://cdn-msp.18comic.org/media/photos/529221/00004.gif
  public async fetchOriginMeta(url: string, _: boolean): Promise<OriginMeta> {
    return { url };
  }

  public async parseImgNodes(source: PagesSource): Promise<ImageNode[]> {
    const list: ImageNode[] = [];
    const raw = await window.fetch(source.raw as string).then(resp => resp.text());
    const document = new DOMParser().parseFromString(raw, "text/html");
    const images = Array.from(document.querySelectorAll<HTMLImageElement>(".scramble-page:not(.thewayhome) > img"));
    for (const img of images) {
      const src = img.getAttribute("data-original");
      if (!src) {
        evLog("warn: cannot find data-original", img);
        continue;
      }
      list.push(new ImageNode("", src, src.split("/").pop()!));
    }
    return list;
  }

  public async *fetchPagesSource(): AsyncGenerator<PagesSource> {
    const episode = Array.from(document.querySelectorAll<HTMLAnchorElement>(".episode > ul > a"));
    if (episode.length > 0) {
      for (const a of episode) {
        const href = a.href;
        yield { raw: href, typ: "url" };
      }
      return;
    }
    const href = document.querySelector<HTMLAnchorElement>(".read-block > a")?.href;
    if (href === undefined) throw new Error("No page found");
    yield { raw: href, typ: "url" };
    return;
  }
}
