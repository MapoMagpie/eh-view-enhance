import ImageNode from "../img-node";
import { Chapter } from "../page-fetcher";
import { isImage, isVideo } from "../utils/media_helper";
import { BaseMatcher, OriginMeta, Result } from "./platform";
import * as zip_js from "@zip.js/zip.js";

export class MiniServeMatcher extends BaseMatcher<string> {
  map: Map<number, Map<string, Promise<Blob>>> = new Map();
  name(): string {
    return "Mini Serve";
  }
  async fetchChapters(): Promise<Chapter[]> {
    const list = Array.from(document.querySelectorAll<HTMLAnchorElement>("table tbody a.file"));
    const chapters: Chapter[] = [];
    let id = 0;
    for (const a of list) {
      const href = a.href;
      const ext = href.split(".").pop();
      if (ext === "zip") {
        chapters.push({
          id: id,
          title: a.textContent ?? ("unknown-" + id),
          source: href,
          queue: [],
        });
        id++;
      }
    }
    return chapters;
  }
  async *fetchPagesSource(source: Chapter): AsyncGenerator<Result<string>> {
    yield Result.ok(source.source);
  }
  async parseImgNodes(href: string, chapterID: number): Promise<ImageNode[]> {
    const blob = await window.fetch(href).then(res => res.blob());
    const zipReader = new zip_js.ZipReader(new zip_js.BlobReader(blob));
    const entries = await zipReader.getEntries();
    const map = new Map<string, Promise<Blob>>;
    this.map.set(chapterID, map);
    return entries.filter(e => {
      const ext = e.filename.split(".").pop() ?? "jpg";
      return isImage(ext) || isVideo(ext);
    }
    ).map(e => {
      const promise = e.getData!(new zip_js.BlobWriter());
      map.set(e.filename, promise);
      const ext = e.filename.split(".").pop() ?? "jpg";
      const node = new ImageNode("", e.filename, e.filename, undefined);
      node.mimeType = isVideo(ext) ? "video/mp4" : undefined;
      return node;
    });
  }
  async fetchOriginMeta(node: ImageNode, _retry: boolean, chapterID: number): Promise<OriginMeta> {
    const dataPromise = this.map.get(chapterID)?.get(node.href);
    if (!dataPromise) throw new Error("cannot read image from zip");
    const data = await dataPromise;
    return { url: URL.createObjectURL(data) };
  }
  async processData(data: Uint8Array, contentType: string, node: ImageNode): Promise<[Uint8Array, string]> {
    const ext = node.href.split(".").pop() ?? "jpg";
    if (isVideo(ext)) return [data, "video/mp4"];
    return [data, contentType];
  }
  workURL(): RegExp {
    return /.*:41021/;
  }
}
