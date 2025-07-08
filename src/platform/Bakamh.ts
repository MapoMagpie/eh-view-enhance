import { GalleryMeta } from "../download/gallery-meta";
import ImageNode from "../img-node";
import { Chapter } from "../page-fetcher";
import { BaseMatcher, OriginMeta, Result } from "./platform";

export class BakamhMatcher extends BaseMatcher<string> {

  name(): string {
    return "Bakamh";
  }

  workURL(): RegExp {
    return /bakamh.com\/manga\/[^\/]+\/$/;
  }

  async fetchChapters(): Promise<Chapter[]> {
    const elements = Array.from(document.querySelectorAll<HTMLAnchorElement>(".wp-manga-chapter > a"));
    return elements.map((elem, i) => {
      const title = elem.textContent?.trim() ?? ("untitled-" + (i + 1));
      return new Chapter(i, title, elem.href);
    });
  }

  async *fetchPagesSource(ch: Chapter): AsyncGenerator<Result<string>> {
    yield Result.ok(ch.source);
  }

  async parseImgNodes(source: string): Promise<ImageNode[]> {
    const doc = await window.fetch(source).then(resp => resp.text()).then(text => new DOMParser().parseFromString(text, "text/html")).catch(Error);
    if (doc instanceof Error) throw doc;
    const images = Array.from(doc.querySelectorAll<HTMLImageElement>(".reading-content > .page-break > img"));
    if (images.length === 0) throw new Error("cannot find images from chapter: " + source);
    return images.map(image => new ImageNode("", source, `${image.id}.${image.src.split(".").pop() ?? "jpg"}`, undefined, image.src));
  }

  async fetchOriginMeta(node: ImageNode): Promise<OriginMeta> {
    return { url: node.originSrc! };
  }

  meta?: GalleryMeta;
  galleryMeta(): GalleryMeta {
    if (this.meta) return this.meta;
    let title = document.querySelector("#manga-title h1")?.textContent ?? document.title;
    title = title.replaceAll(/\s/g, "");
    const meta = new GalleryMeta(window.location.href, title);
    const items = Array.from(document.querySelectorAll<HTMLElement>(".post-content > .post-content_item"));
    items.forEach(item => {
      const cate = item.querySelector(".summary-heading")?.textContent?.trim();
      if (!cate) return;
      const author = item.querySelector(".summary-content > .author-content > a")?.textContent;
      if (author) meta.tags[cate] = [author];
      const genres = item.querySelector(".summary-content > .genres-content > a")?.textContent;
      if (genres) meta.tags[cate] = [genres];
      const tags = Array.from(item.querySelectorAll(".summary-content > .tags-content > a")).map(a => a.textContent).filter(Boolean) as string[];
      if (tags && tags.length > 0) meta.tags[cate] = tags;
    });
    this.meta = meta;
    return this.meta;
  }

}
