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
    const images = Array.from(doc.querySelectorAll<HTMLImageElement>(".article-content img:not(.arca-emoticon)"));
    const digits = images.length.toString().length;
    return images.filter(img => img.style.width !== "0px").map<ImageNode>((img, i) => {
      const src = img.src;
      const href = new URL(src);
      const ext = href.pathname.split(".").pop();
      href.searchParams.set("type", "orig");
      let title = (i + 1).toString().padStart(digits, "0") + "." + ext;
      return new ImageNode(src, href.href, title, undefined, href.href);
    });
  }
  async fetchOriginMeta(node: ImageNode): Promise<OriginMeta> {
    return { url: node.href };
  }
  workURL(): RegExp {
    return /arca.live\/b\/\w*\/\d+/;
  }
}
