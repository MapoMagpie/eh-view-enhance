import { GalleryMeta } from "../download/gallery-meta";
import ImageNode from "../img-node";
import { Matcher, PagesSource } from "./platform";

function get_num(gid: string, page: string) {
  let ret = 10;
  //@ts-ignore
  let m = md5(gid + page) as string;
  let n = m.substring(m.length - 1).charCodeAt(0);
  if (gid >= window.atob('MjY4ODUw') && gid <= window.atob('NDIxOTI1')) {
    n %= 10;
  } else if (gid >= window.atob('NDIxOTI2')) {
    n %= 8
  }
  switch (n) {
    case 0:
      ret = 2;
      break;
    case 1:
      ret = 4;
      break;
    case 2:
      ret = 6;
      break;
    case 3:
      ret = 8;
      break;
    case 4:
      ret = 10;
      break;
    case 5:
      ret = 12;
      break;
    case 6:
      ret = 14;
      break;
    case 7:
      ret = 16;
      break;
    case 8:
      ret = 18;
      break;
    case 9:
      ret = 20
  }
  return ret
}

function drawImage(ctx: CanvasRenderingContext2D, e: ImageBitmap, gid: string, page: string) {
  const width = e.width;
  const height = e.height;
  const s = get_num(gid, page);
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
    if (gid < "220980") return data;
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
    return /18comic.org\/album\/\d+/;
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
  public async matchImgURL(url: string, _: boolean): Promise<string> {
    return url;
  }

  public async parseImgNodes(source: PagesSource): Promise<ImageNode[]> {
    const list: ImageNode[] = [];
    const raw = await window.fetch(source.raw as string).then(resp => resp.text());
    const document = new DOMParser().parseFromString(raw, "text/html");
    const images = Array.from(document.querySelectorAll<HTMLImageElement>(".scramble-page > img"));
    for (const img of images) {
      const src = img.getAttribute("data-original")!;
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
