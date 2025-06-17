import { GalleryMeta } from "../download/gallery-meta";
import ImageNode from "../img-node";
import { BaseMatcher, OriginMeta, Result } from "./platform";

type HentaiZapGalleryInfo = {
  serverID: string,
  galleryID: string,
  loadDir: string,
  loadID: string,
  loadPages: number,
  images: Record<string, string>,
}

const HENTAIZAP_TYPE_MAP: Record<string, string> = {
  "j": "jpg",
  "p": "png",
  "b": "bmp",
  "g": "gif",
  "w": "webp",
};

export class HentaiZapMatcher extends BaseMatcher<HentaiZapGalleryInfo> {
  meta?: GalleryMeta;

  name(): string {
    return "HentaiZap";
  }

  galleryMeta(): GalleryMeta {
    if (this.meta) return this.meta;
    const title = document.querySelector(".gp_top_right > h1")?.textContent ?? document.title;
    this.meta = new GalleryMeta(window.location.href, title);
    Array.from(document.querySelectorAll<HTMLElement>(".gp_top_right_info > ul")).forEach(ul => {
      const category = ul.querySelector("span.info_txt")?.textContent?.replace(":", "")?.toLowerCase();
      if (!category) return;
      const tags = Array.from(ul.querySelectorAll<HTMLElement>("a.gp_btn_tag")).map(e => e.firstChild?.textContent).filter(Boolean) as string[];
      this.meta!.tags[category] = tags;
    });
    return this.meta;
  }

  async *fetchPagesSource(): AsyncGenerator<Result<HentaiZapGalleryInfo>> {
    const gthRaw = Array.from(document.querySelectorAll<HTMLScriptElement>("script"))
      .find(e => e.textContent?.trimStart()?.startsWith("var g_th"))
      ?.textContent?.match(/\('(\{.*\})'\)/)?.[1];
    if (!gthRaw) throw new Error("cannot find g_th");
    const serverID = document.querySelector<HTMLInputElement>("input#load_server")?.value;
    if (!serverID) throw new Error("cannot find server id");
    const loadDir = document.querySelector<HTMLInputElement>("input#load_dir")?.value;
    if (!loadDir) throw new Error("cannot find load dir");
    const galleryID = document.querySelector<HTMLInputElement>("input#gallery_id")?.value;
    if (!galleryID) throw new Error("cannot find gallery id");
    const loadID = document.querySelector<HTMLInputElement>("input#load_id")?.value;
    if (!loadID) throw new Error("cannot find load id");
    const loadPages = document.querySelector<HTMLInputElement>("input#load_pages")?.value;
    if (!loadPages) throw new Error("cannot find load pages");
    const gth = JSON.parse(gthRaw) as Record<string, string>;
    const info: HentaiZapGalleryInfo = {
      serverID, galleryID, loadDir, loadID, loadPages: parseInt(loadPages), images: gth
    };
    yield Result.ok(info);
  }

  async parseImgNodes(info: HentaiZapGalleryInfo): Promise<ImageNode[]> {
    const server = `m${info.serverID}.hentaizap.com`;
    const nodes: ImageNode[] = [];
    const digits = info.loadPages.toString().length;
    for (let i = 0; i < info.loadPages; i++) {
      // https://m10.hentaizap.com/029/ebsm4v8rz0/1t.jpg
      const [t, w, h] = info.images[(i + 1).toString()]?.split(",") ?? [];
      if (!t || !w || !h) throw new Error("cannot find image g_th: " + (i + 1));
      const ext = HENTAIZAP_TYPE_MAP[t] ?? "webp";
      const thumb = `https://${server}/${info.loadDir}/${info.loadID}/${i + 1}t.jpg`;
      const href = `${window.location.origin}/g/${info.galleryID}/${i + 1}/`;
      const origin = `https://${server}/${info.loadDir}/${info.loadID}/${i + 1}.${ext}`;
      const title = (i + 1).toString().padStart(digits, "0");
      const node = new ImageNode(thumb, href, `${title}.${ext}`, undefined, origin, { w: parseInt(w), h: parseInt(h) });
      nodes.push(node);
    }
    return nodes;
  }

  async fetchOriginMeta(node: ImageNode): Promise<OriginMeta> {
    return { url: node.originSrc! };
  }

  workURL(): RegExp {
    return /hentaizap.com\/gallery\/\w+\/?/;
  }

}

