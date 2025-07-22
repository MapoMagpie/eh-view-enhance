import { GalleryMeta } from "../download/gallery-meta";
import ImageNode from "../img-node";
import { Chapter } from "../page-fetcher";
import { evLog } from "../utils/ev-log";
import { BaseMatcher, OriginMeta, Result } from "./platform";

export class BatotoMatcher extends BaseMatcher<Document> {

  name(): string {
    return "BATO.TO v3x";
  }
  workURL(): RegExp {
    return /(mangatoto.com|bato.to)\/title\/\d+[^\/]*$/;
  }

  meta?: GalleryMeta;
  galleryMeta(): GalleryMeta {
    if (this.meta) return this.meta;
    const meta = new GalleryMeta(window.location.href, "");
    const raw = document.querySelector("astro-island[component-url^='/_astro/Display_EmotionChart'][props]")?.getAttribute("props");
    if (raw) {
      const data = JSON.parse(raw)?.data?.[1];
      if (data?.name) {
        meta.title = data.name[1];
        try {
          ["artists", "authors", "genres", "altNames"].forEach(cat => {
            const d = JSON.parse(data[cat][1]) as [number, string][];
            const values = d.map(v => v[1]);
            meta.tags[cat] = values;
            if (cat === "altNames") {
              meta.originTitle = values[values.length - 1];
            }
          })
        } catch (err) {
          evLog("error", "parse gallery info error", err);
        }
      }
    }
    this.meta = meta;
    return this.meta;
  }

  async fetchChapters(): Promise<Chapter[]> {
    let elements = Array.from(document.querySelectorAll<HTMLDivElement>("div[name=chapter-list] .scrollable-panel astro-slot > div"));
    elements = elements.reverse();
    return elements.map((elem, i) => {
      const a = elem.querySelector<HTMLAnchorElement>("div:first-child > a");
      if (!a) throw new Error("cannot find chapter element");
      return new Chapter(i, a.textContent!, a.href);
    });
  }

  async *fetchPagesSource(chapter: Chapter): AsyncGenerator<Result<Document>> {
    const url = new URL(chapter.source);
    url.searchParams.set("load", "2");
    const doc = await window.fetch(url).then(resp => resp.text()).then(text => new DOMParser().parseFromString(text, "text/html")).catch(Error);
    if (doc instanceof Error) throw doc;
    yield Result.ok(doc);
  }

  async parseImgNodes(doc: Document): Promise<ImageNode[]> {
    const raw = doc.querySelector("astro-island[component-url^='/_astro/ImageList'][props]")?.getAttribute("props");
    if (!raw) throw new Error("cannot find ImageList props");
    const json1 = JSON.parse(raw);
    if (!json1.imageFiles?.[1]) throw new Error("cannot find imageFiles from ImageList props");
    const images = JSON.parse(json1.imageFiles[1]) as [number, string][];
    if (!images.length || images.length === 0) throw new Error("cannot find images");
    const digits = images.length.toString().length;
    return images.map(([_, url], i) => {
      const title = (i + 1).toString().padStart(digits, "0");
      const ext = url.split(".").pop() ?? "webp";
      let wh = undefined;
      const matches = url.match(/\/\d+_(\d+)_(\d+)_\d+\.\w+$/);
      if (matches && matches.length === 3) {
        wh = { w: parseInt(matches[1]), h: parseInt(matches[2]) };
      }
      return new ImageNode("", i + 1 + "", `${title}.${ext}`, undefined, url, wh);
    })
  }

  async fetchOriginMeta(node: ImageNode): Promise<OriginMeta> {
    return { url: node.originSrc! };
  }

} 
