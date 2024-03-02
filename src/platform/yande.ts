import { conf } from "../config";
import { GalleryMeta } from "../download/gallery-meta";
import ImageNode from "../img-node";
import { Matcher, OriginMeta, PagesSource } from "./platform";

export class YandeMatcher implements Matcher {

  async processData(data: Uint8Array, _1: string, _2: string): Promise<Uint8Array> {
    return data;
  }

  workURL(): RegExp {
    return /yande.re\/post(?!\/show\/.*)/;
  }

  public async *fetchPagesSource(): AsyncGenerator<PagesSource> {
    let currentE = document.querySelector("em.current")?.textContent || 1;
    let allA = document.querySelectorAll("div.pagination a");
    let latestE = allA.length > 0 ? allA[allA.length - 2].textContent || 1 : 1;

    let curPageNumber = Number(currentE); // 20 +25
    let latestPageNumber = Number(latestE);

    const u = new URL(location.href);
    for (let p = curPageNumber; p <= latestPageNumber; p++) {
      u.searchParams.set("page", p.toString());
      // console.log(u.href);
      yield { raw: u.href, typ: "url" };
    }
  }

  private transformBigImageToSample(url: string): string {
    // yande.re%201145494
    // yande.re%201145494%20sample
    // let raw = url;
    url = url.replace("image", "sample");
    url = url.replace(/(yande.re%20\d+)/, "$1%20sample");
    url = url.replace(".png", ".jpg"); // in case if big image is png format
    // console.log(raw + "\n"+url);
    return url;
  }

  public async fetchOriginMeta(href: string, _: boolean): Promise<OriginMeta> {
    if (!conf.fetchOriginal) {
      return { url: href };
    }
    return { url: this.transformBigImageToSample(href) };
  }

  public async parseImgNodes(page: PagesSource): Promise<ImageNode[] | never> {
    const list: ImageNode[] = [];
    let doc = await (async (): Promise<Document | null> => {
      if (page.raw instanceof Document) {
        return page.raw;
      } else {
        const raw = await window.fetch(page.raw as string).then((response) => response.text());
        if (!raw) return null;
        const domParser = new DOMParser();
        return domParser.parseFromString(raw, "text/html");
      }
    })();

    if (!doc) {
      throw new Error("warn: yande matcher failed to get document from source page!")
    }

    // title : page2 0001.jpg
    let url = new URL(page.raw as string);
    let titlePrefix = ("page" + url.searchParams.get("page") || "nopage") + " ";
    let query = doc.querySelectorAll<HTMLLIElement>("ul#post-list-posts li");

    query.forEach((liNode, key) => {
      let largeImgNode = liNode.querySelector<HTMLAnchorElement>("a.directlink")
      let previewNode = liNode.querySelector<HTMLImageElement>("img.preview")
      const newNode = new ImageNode(
        previewNode!.src,
        largeImgNode!.href,
        titlePrefix + ("000" + (key + 1)).slice(-4) + ".jpg" || "untitle.jpg",
      );
      list.push(newNode);
    });

    return list;
  }

  public parseGalleryMeta(doc: Document): GalleryMeta {
    const meta = new GalleryMeta(window.location.href, "yande");
    let ul = doc.querySelector("ul#tag-sidebar");

    let tagLabels = [
      { className: "circle", tagName: "artist" },
      { className: "artist", tagName: "artist" },
      { className: "copyright", tagName: "copyright" },
      { className: "character", tagName: "character" },
      { className: "general", tagName: "general" } //xp
    ];
    tagLabels.forEach((label) => {
      let elements = ul?.querySelectorAll<HTMLLIElement>("li.tag-type-" + label.className);
      if (!meta.tags[label.tagName]) meta.tags[label.tagName] = [];
      elements?.forEach((e) => {
        let tag = e?.querySelectorAll("a")[3]?.textContent;
        if (!!tag) meta.tags[label.tagName].push(tag);
        // console.log(work, elements, tag);
      });
      if (meta.tags[label.tagName].length == 0) delete (meta.tags[label.tagName]);
    });
    return meta
  }
}
