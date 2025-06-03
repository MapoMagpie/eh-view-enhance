import { GalleryMeta } from "../download/gallery-meta";
import ImageNode from "../img-node";
import { Chapter } from "../page-fetcher";
import { evLog } from "../utils/ev-log";
import { BaseMatcher, OriginMeta, Result } from "./platform"

type MyComicXData = {
  chapters?: { id: number, title: string }[],
  decending?: boolean,
}

export class MyComicMatcher extends BaseMatcher<Document> {
  meta?: GalleryMeta;
  name(): string {
    return "My Comic";
  }
  workURL(): RegExp {
    return /mycomic.com\/(\w+\/)?comics\/\d+$/;
  }
  galleryMeta(chapter: Chapter): GalleryMeta {
    return this.meta ?? super.galleryMeta(chapter);
  }

  initGalleryMeta() {
    const title = document.querySelector<HTMLDivElement>(".grow > div[data-flux-heading]")?.textContent ?? document.title;
    this.meta = new GalleryMeta(window.location.href, title);
  }

  async fetchChapters(): Promise<Chapter[]> {
    this.initGalleryMeta();
    const volumes = Array.from(document.querySelectorAll<HTMLDivElement>(".mt-8.mb-12 > div[x-data]"));
    const result = [];
    for (const vol of volumes) {
      let raw = vol.getAttribute("x-data");
      if (raw) {
        raw = raw.replace(/,\n\s*toggleSorting\(\) \{.*?\},/gms, "");
        raw = raw.replaceAll(/(chapters|decending)/g, "\"$1\"");
      }
      const data = JSON.parse(raw ?? "{}") as MyComicXData;
      let volName = vol.querySelector<HTMLDivElement>(".text-lg > div")?.textContent ?? "";
      volName = volName ? volName + "-" : "";
      if (!data.chapters) continue;
      const chs = data.chapters.map<Chapter>(ch =>
        new Chapter(ch.id, volName + ch.title, `https://mycomic.com/cn/chapters/${ch.id}`)
      );
      result.push(...chs);
    }
    return result;
  }

  async *fetchPagesSource(ch: Chapter): AsyncGenerator<Result<Document>> {
    const doc = await window.fetch(ch.source).then(res => res.text()).then(text => (new DOMParser()).parseFromString(text, "text/html"));
    yield Result.ok(doc);
  }

  async parseImgNodes(doc: Document, _chapterID?: number): Promise<ImageNode[]> {
    const imgs = Array.from(doc.querySelectorAll<HTMLImageElement>(".\\-mx-6 > img[x-ref]"));
    const imgNodes = [];
    const digits = imgs.length.toString().length;
    for (let i = 0; i < imgs.length; i++) {
      const img = imgs[i];
      const src = img.getAttribute("src") || img.getAttribute("data-src");
      if (!src) {
        evLog("error", `cannot find imgage src, `, img);
        continue;
      };
      const ext = src.split(".").pop();
      const title = (i + 1).toString().padStart(digits, "0") + "." + ext;
      imgNodes.push(new ImageNode("", src, title, undefined, src, { w: img.width, h: img.height }));
    }
    return imgNodes;
  }

  async fetchOriginMeta(node: ImageNode): Promise<OriginMeta> {
    return { url: node.originSrc! };
  }

}
