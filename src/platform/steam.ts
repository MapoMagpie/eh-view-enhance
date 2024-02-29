import { GalleryMeta } from "../download/gallery-meta";
import ImageNode from "../img-node";
import { Matcher, PagesSource } from "./platform";

const STEAM_THUMB_IMG_URL_REGEX = /background-image:\surl\(.*?(h.*\/).*?\)/;
export class SteamMatcher implements Matcher {

  // 'https://steamcommunity.com/id/*/screenshots*',
  workURL(): RegExp {
    // return /https?:\/\/steamcommunity\.com\/(id|profiles)\/[^/]+\/(screenshots|workshop)\/\?appid=\d+/;
    return /steamcommunity.com\/id\/[^/]+\/screenshots.*/;
  }

  public async matchImgURL(url: string, _: boolean): Promise<string> {
    let raw = "";
    try {
      raw = await window.fetch(url).then(resp => resp.text());
      if (!raw) throw new Error("[text] is empty");
    } catch (error) {
      throw new Error(`Fetch source page error, expected [text]！ ${error}`);
    }
    const domParser = new DOMParser();
    const doc = domParser.parseFromString(raw, "text/html");
    let imgURL = doc.querySelector(".actualmediactn > a")?.getAttribute("href");
    if (!imgURL) {
      throw new Error("Cannot Query Steam original Image URL");
    }
    return imgURL;
  }

  public async parseImgNodes(page: PagesSource): Promise<ImageNode[] | never> {
    const list: ImageNode[] = [];
    const doc = await (async () => {
      if (page.raw instanceof Document) {
        return page.raw
      } else {
        const raw = await window.fetch(page.raw).then((response) => response.text());
        if (!raw) return null;
        const domParser = new DOMParser();
        return domParser.parseFromString(raw, "text/html");
      }
    })();

    if (!doc) {
      throw new Error("warn: steam matcher failed to get document from source page!")
    }

    const nodes = doc.querySelectorAll(".profile_media_item");
    if (!nodes || nodes.length == 0) {
      throw new Error("warn: failed query image nodes!")
    }
    for (const node of Array.from(nodes)) {
      const src = STEAM_THUMB_IMG_URL_REGEX.exec(node.innerHTML)?.[1];
      if (!src) {
        throw new Error(`Cannot Match Steam Image URL, Content: ${node.innerHTML}`);
      }
      const newNode = new ImageNode(
        src,
        node.getAttribute("href")!,
        node.getAttribute("data-publishedfileid")! + ".jpg",
      );
      list.push(newNode);
    }
    return list;
  }

  public async *fetchPagesSource(): AsyncGenerator<PagesSource> {
    let totalPages = -1;
    document.querySelectorAll(".pagingPageLink").forEach(ele => {
      totalPages = Number(ele.textContent);
    });
    let url = new URL(window.location.href);
    url.searchParams.set("view", "grid");
    if (totalPages === -1) {
      const doc = await window.fetch(url.href).then((response) => response.text()).then((text) => new DOMParser().parseFromString(text, "text/html")).catch(() => null);
      if (!doc) {
        throw new Error("warn: steam matcher failed to get document from source page!")
      }
      doc.querySelectorAll(".pagingPageLink").forEach(ele => {
        totalPages = Number(ele.textContent);
      });
    }
    if (totalPages > 0) {
      for (let p = 1; p <= totalPages; p++) {
        url.searchParams.set("p", p.toString());
        yield { raw: url.href, typ: "url" };
      }
    } else {
      yield { raw: url.href, typ: "url" };
    }
  }

  parseGalleryMeta(_: Document): GalleryMeta {
    const url = new URL(window.location.href);
    let appid = url.searchParams.get("appid");
    return new GalleryMeta(window.location.href, "steam-" + appid || "all");
  }

}
