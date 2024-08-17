import { GalleryMeta } from "../download/gallery-meta";
import ImageNode from "../img-node";
import { PagesSource } from "../page-fetcher";
import { BaseMatcher, OriginMeta } from "./platform";

const NH_IMG_URL_REGEX = /<a\shref="\/g[^>]*?><img\ssrc="([^"]*)"/;
export class NHMatcher extends BaseMatcher {
  name(): string {
    return "nhentai";
  }

  workURL(): RegExp {
    return /nhentai.net\/g\/\d+\/?$/;
  }

  galleryMeta(doc: Document): GalleryMeta {
    let title: string | undefined;
    let originTitle: string | undefined;
    doc.querySelectorAll("#info .title").forEach(ele => {
      if (!title) {
        title = ele.textContent || undefined;
      } else {
        originTitle = ele.textContent || undefined;
      }
    });
    const meta = new GalleryMeta(window.location.href, title || "UNTITLE");
    meta.originTitle = originTitle;
    const tagTrList = doc.querySelectorAll<HTMLElement>(".tag-container");
    const tags: Record<string, string[]> = {};
    tagTrList.forEach((tr) => {
      const cat = tr.firstChild?.textContent?.trim().replace(":", "");
      if (cat) {
        const list: string[] = [];
        tr.querySelectorAll(".tag .name").forEach(tag => {
          const t = tag.textContent?.trim();
          if (t) {
            list.push(t);
          }
        })
        if (list.length > 0) {
          tags[cat] = list;
        }
      }
    });
    meta.tags = tags;
    return meta;
  }

  async fetchOriginMeta(node: ImageNode): Promise<OriginMeta> {
    let text = "";
    try {
      text = await window.fetch(node.href).then(resp => resp.text());
      if (!text) throw new Error("[text] is empty");
    } catch (error) {
      throw new Error(`Fetch source page error, expected [text]！ ${error}`);
    }
    return { url: NH_IMG_URL_REGEX.exec(text)![1] };
  }

  async parseImgNodes(source: PagesSource): Promise<ImageNode[]> {
    const list: ImageNode[] = [];

    const nodes = (source as Document).querySelectorAll<HTMLElement>(".thumb-container > .gallerythumb");
    if (!nodes || nodes.length == 0) {
      throw new Error("warn: failed query image nodes!")
    }

    let i = 0;
    for (const node of Array.from(nodes)) {
      i++;
      const imgNode = node.querySelector("img");
      if (!imgNode) {
        throw new Error("Cannot find Image");
      }
      const newNode = new ImageNode(
        imgNode.getAttribute("data-src")!,
        location.origin + node.getAttribute("href")!,
        imgNode.getAttribute("title") || `${i}.jpg`,
      );
      list.push(newNode);
    }
    return list;
  }

  public async *fetchPagesSource(): AsyncGenerator<PagesSource> {
    yield document;
  }

}
