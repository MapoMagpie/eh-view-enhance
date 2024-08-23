import { conf } from "../config";
import ImageNode from "../img-node";
import { PagesSource } from "../page-fetcher";
import { BaseMatcher, OriginMeta } from "./platform";

export class ArcaMatcher extends BaseMatcher {

  name(): string {
    return "Arca";
  }
  async *fetchPagesSource(): AsyncGenerator<PagesSource> {
    yield document;
  }
  async parseImgNodes(page: PagesSource): Promise<ImageNode[]> {
    const doc = page as Document;
    const images = Array.from(doc.querySelectorAll<HTMLImageElement>(".article-content > p > a > img:not(.arca-emoticon)"));
    const digits = images.length.toString().length;
    return images.map<ImageNode>((img, i) => {
      const src = img.src;
      const href = (img.parentElement as HTMLAnchorElement).href;
      const ext = new URL(href).pathname.split(".").pop();
      let title = (i + 1).toString().padStart(digits, "0") + "." + ext;
      return new ImageNode(src, href, title, undefined, href);
    });
  }
  async fetchOriginMeta(node: ImageNode): Promise<OriginMeta> {
    return { url: conf.fetchOriginal ? node.href : node.thumbnailSrc };
  }
  workURL(): RegExp {
    return /arca.live\/b\/\w*\/\d+/;
  }
}
