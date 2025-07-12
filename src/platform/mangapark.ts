import ImageNode from "../img-node";
import { Chapter } from "../page-fetcher";
import { BaseMatcher, OriginMeta, Result } from "./platform";

export class MangaParkMatcher extends BaseMatcher<string> {

  name(): string {
    return "MangaPark";
  }

  // https://mangapark.net/title/426777-en-i-said-i-d-make-science-content-so-why-are-all-my-fans-witches
  workURL(): RegExp {
    return /mangapark.(net|com)\/title\/[^/]+$/;
  }

  async fetchChapters(): Promise<Chapter[]> {
    const list = Array.from(document.querySelectorAll<HTMLAnchorElement>("div[data-name='chapter-list'] .flex-col > .px-2 > .space-x-1 > a"));
    return list.map((elem, i) => new Chapter(i, elem.textContent ?? "Chapter" + (i + 1), elem.href));
  }

  async *fetchPagesSource(source: Chapter): AsyncGenerator<Result<string>> {
    yield Result.ok(source.source);
  }

  async parseImgNodes(href: string): Promise<ImageNode[]> {
    const doc = await window.fetch(href).then(resp => resp.text()).then(text => new DOMParser().parseFromString(text, "text/html")).catch(Error);
    if (doc instanceof Error) throw doc;
    const elements = Array.from(doc.querySelectorAll<HTMLDivElement>("div[data-name='image-item'] > div"));
    const digits = elements.length.toString().length;
    return elements.map((elem, i) => {
      const src = elem.querySelector<HTMLImageElement>("img")?.src;
      if (!src) throw new Error("cannot find image from chapter: " + href);
      const ext = src.split(".").pop() ?? "jpg";
      const title = (i + 1).toString().padStart(digits, "0") + "." + ext;
      const [w, h] = [parseInt(elem.style.width), parseInt(elem.style.height)];
      const node = new ImageNode("", href, title, undefined, src, { w, h });
      return node;
    });
  }

  async fetchOriginMeta(node: ImageNode): Promise<OriginMeta> {
    return { url: node.originSrc! };
  }

}
