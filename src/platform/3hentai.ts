import { GalleryMeta } from "../download/gallery-meta";
import ImageNode from "../img-node";
import { BaseMatcher, OriginMeta, Result } from "./platform";

export class Hentai3Matcher extends BaseMatcher<Document> {
  name(): string {
    return "3Hentai";
  }

  workURL(): RegExp {
    return /3hentai.net\/d\/\d+$/;
  }

  async *fetchPagesSource(): AsyncGenerator<Result<Document>> {
    yield Result.ok(document);
  }

  async parseImgNodes(doc: Document): Promise<ImageNode[]> {
    const elements = Array.from(doc.querySelectorAll<HTMLAnchorElement>(".single-thumb > a"));
    const digits = elements.length.toString().length;
    const nodes = elements.map((elem, i) => {
      const href = elem.href;
      const img = elem.querySelector<HTMLImageElement>("img.lazy");
      if (!img) throw new Error("cannot find image element");
      const thumb = img.getAttribute("data-src") ?? "";
      const ext = thumb.split(".").pop() ?? "jpg";
      const title = (i + 1).toString().padStart(digits, "0") + "." + ext;
      const node = new ImageNode(thumb, href, title, undefined, undefined, { w: img.width, h: img.height });
      return node;
    });
    if (nodes.length === 0) {
      throw new Error("cannot find images by css selector: .single-thumb > a");
    }
    // fetch first image document, get the readerPages info
    const firstImageDoc = await window.fetch(nodes[0].href).then(resp => resp.text()).then(text => new DOMParser().parseFromString(text, "text/html")).catch(Error);
    if (firstImageDoc instanceof Error) throw firstImageDoc;
    const scriptElem = Array.from(firstImageDoc.querySelectorAll<HTMLScriptElement>("script")).find(elem => elem.textContent?.trimStart().startsWith("var readerPages "));
    const pagesRaw = scriptElem?.textContent?.match(/var readerPages = JSON\.parse\(atob\("(.*)?\"\)\)/)?.[1];
    if (pagesRaw) {
      const pages = JSON.parse(window.atob(pagesRaw)) as Hentai3ReaderPages;
      nodes.forEach((node, i) => {
        const page = pages.pages[(i + 1).toString()];
        if (!page) return;
        node.title = page.f ?? node.title;
        node.originSrc = pages.baseUriImg.replace("%s", page.f);
        node.rect = { w: page.w, h: page.h };
      });
    }
    return nodes;
  }

  async fetchOriginMeta(node: ImageNode): Promise<OriginMeta> {
    if (node.originSrc) return { url: node.originSrc };

    const doc = await window.fetch(node.href).then(resp => resp.text()).then(text => new DOMParser().parseFromString(text, "text/html")).catch(Error);
    if (doc instanceof Error) throw doc;
    const image = doc.querySelector<HTMLImageElement>(".js-main-img");
    if (!image) throw new Error("cannot find image from: " + node.href);
    return { url: image.src, title: image.src.split("/").pop() ?? node.title };
  }

  meta?: GalleryMeta;
  galleryMeta(): GalleryMeta {
    if (this.meta) return this.meta;
    const title = document.querySelector("#main-info > h1")?.textContent ?? document.title;
    const meta = new GalleryMeta(window.location.href, title);
    Array.from(document.querySelectorAll<HTMLDivElement>(".tag-container.field-name")).forEach(elem => {
      const cate = elem.firstChild?.textContent?.trim()?.replace(":", "")?.toLowerCase()
      const filterElem = Array.from(elem.querySelectorAll<HTMLSpanElement>("span.filter-elem"));
      if (cate && filterElem.length > 0) {
        const tags = filterElem.map(elem => elem.textContent?.trim()).filter(Boolean);
        meta.tags[cate] = tags;
      }
    });

    this.meta = meta;
    return this.meta;
  }

}

type Hentai3ReaderPages = {
  baseUri: string,
  baseUriImg: string,
  lastPage: number,
  pages: Record<string, { f: string, h: number, w: number }>,
}
