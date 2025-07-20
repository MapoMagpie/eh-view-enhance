import { GalleryMeta } from "../download/gallery-meta";
import ImageNode from "../img-node";
import { BaseMatcher, OriginMeta, Result } from "./platform";

export class Hanime1Matcher extends BaseMatcher<Document> {
  meta?: GalleryMeta;
  galleryMeta(): GalleryMeta {
    return this.meta!;
  }
  name(): string {
    return "hanime1.me";
  }
  parseMeta() {
    const title = document.querySelector(".comics-panel-margin h3.title")?.textContent?.replaceAll(/\s/g, "");
    const originTItle = document.querySelector(".comics-panel-margin h4.title")?.textContent?.replaceAll(/\s/g, "");
    const meta = new GalleryMeta(window.location.href, title ?? document.title);
    meta.originTitle = originTItle ?? undefined;
    Array.from(document.querySelectorAll(".comics-panel-margin .comics-metadata-margin-top h5")).forEach(ele => {
      let cat = ele.firstChild?.textContent ?? "misc";
      cat = cat.trim().replace(/：:/, "");
      const tags = Array.from(ele.querySelectorAll("a")).map(t => t.textContent?.trim()).filter(Boolean) as string[];
      meta.tags[cat] = tags;
    });
    this.meta = meta;
  }
  async *fetchPagesSource(): AsyncGenerator<Result<Document>> {
    this.parseMeta();
    yield Result.ok(document);
  }

  async parseImgNodes(doc: Document): Promise<ImageNode[]> {
    const items = Array.from(doc.querySelectorAll<HTMLAnchorElement>(".comics-panel-margin > a"));
    const item0 = items[0];
    const f = { j: 'jpg', p: 'png', g: 'gif', w: 'webp' };
    let prefix = "", extensions = undefined;
    if (item0) {
      const page0 = await window.fetch(item0.href).then(res => res.text()).then(raw => (new DOMParser()).parseFromString(raw, "text/html"));
      const img = page0.querySelector<HTMLImageElement>("#comic-content-wrapper img");
      prefix = img?.getAttribute("prefix") ?? img?.getAttribute("data-prefix") ?? "";
      const raw = page0.querySelector<HTMLScriptElement>("#comic-content-wrapper script")?.textContent?.match(/extensions.innerHTML = '(.*)?'/)?.[1]?.replaceAll("&quot;", "\"");
      extensions = raw ? JSON.parse(raw) as string[] : undefined;
    }
    const digits = items.length.toString().length;
    return items.map((item, index) => {
      const href = item.href;
      const thumb = item.querySelector("img")?.getAttribute("data-srcset") || "";
      let ext = "jpg";
      let src = (prefix && extensions) ? `${prefix}${extensions[index]}.${ext}` : undefined;
      if (prefix && extensions && prefix.includes("nhentai")) {
        const fk = (extensions?.[index] ?? "j") as keyof (typeof f);
        ext = f[fk] ?? "jpg";
        src = `${prefix}${(index + 1)}.${ext}`;
      }
      return new ImageNode(thumb, href, (index + 1).toString().padStart(digits, "0") + "." + ext, undefined, src);
    });
  }

  async fetchOriginMeta(node: ImageNode, retry: boolean): Promise<OriginMeta> {
    if (!retry && node.originSrc) return { url: node.originSrc };
    const page0 = await window.fetch(node.href).then(res => res.text()).then(raw => (new DOMParser()).parseFromString(raw, "text/html"));
    const img = page0.querySelector<HTMLImageElement>("#comic-content-wrapper img");
    if (!img) throw new Error("cannot find img from " + node.href);
    return { url: img.src };
  }

  headers(): Record<string, string> {
    return {
      "Origin": "",
      "Referer": "",
    }
  }

  workURL(): RegExp {
    return /hanime1.me\/comic\/\d+\/?$/;
  }

}
