import { GalleryMeta } from "../downloader";
import { Matcher, PagesSource } from "./platform";

const NH_IMG_URL_REGEX = /<a\shref="\/g[^>]*?><img\ssrc="([^"]*)"/;
export class NHMatcher implements Matcher {

  public parseGalleryMeta(doc: Document): GalleryMeta {
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

  public async matchImgURL(url: string, _: boolean): Promise<string> {
    let text = "";
    try {
      text = await window.fetch(url).then(resp => resp.text());
      if (!text) throw new Error("[text] is empty");
    } catch (error) {
      throw new Error(`Fetch source page error, expected [text]！ ${error}`);
    }
    return NH_IMG_URL_REGEX.exec(text)![1];
  }

  public async parseImgNodes(page: PagesSource, template: HTMLElement): Promise<HTMLElement[]> {
    const list: HTMLElement[] = [];

    const nodes = (page.raw as Document).querySelectorAll<HTMLElement>(".thumb-container > .gallerythumb");
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
      const newImgNode = template.cloneNode(true) as HTMLDivElement;
      const newImg = newImgNode.firstElementChild as HTMLImageElement;
      newImg.setAttribute("ahref", location.origin + node.getAttribute("href")!);
      newImg.setAttribute("asrc", imgNode.getAttribute("data-src")!);
      newImg.setAttribute("title", imgNode.getAttribute("title") || `${i}.jpg`);
      list.push(newImgNode);
    }
    return list;
  }

  public async *fetchPagesSource(): AsyncGenerator<PagesSource> {
    yield { raw: document, typ: "doc" }
  }

}