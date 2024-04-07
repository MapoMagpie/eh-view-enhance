import { GalleryMeta } from "../download/gallery-meta";
import ImageNode from "../img-node";
import { PagesSource } from "../page-fetcher";
import { evLog } from "../utils/ev-log";
import { BaseMatcher, OriginMeta } from "./platform";

export class Rule34Matcher extends BaseMatcher {
  tags: Record<string, string[]> = {};
  count: number = 0;

  workURL(): RegExp {
    return /rule34.xxx\/index.php\?page=post&s=list/;
  }

  async *fetchPagesSource(): AsyncGenerator<PagesSource> {
    let doc = document;
    yield doc;
    // find next page
    let tryTimes = 0;
    while (true) {
      let next = doc.querySelector<HTMLAnchorElement>(".pagination a[alt=next]");
      if (!next) break;
      let url = next.href;
      if (!url) break;
      try {
        doc = await window.fetch(url).then((res) => res.text()).then((text) => new DOMParser().parseFromString(text, "text/html"));
      } catch (e) {
        tryTimes++;
        if (tryTimes > 3) throw new Error(`fetch next page failed, ${e}`);
        continue;
      }
      tryTimes = 0;
      yield doc;
    }
  }

  async fetchOriginMeta(href: string, _: boolean): Promise<OriginMeta> {
    let url = "";
    const doc = await window.fetch(href).then((res) => res.text()).then((text) => new DOMParser().parseFromString(text, "text/html"));
    const img = doc.querySelector<HTMLImageElement>("#image");
    if (!img) {
      // try to find video
      const video = doc.querySelector<HTMLVideoElement>("#gelcomVideoPlayer");
      if (video) {
        url = video.querySelector("source")?.src || "";
      }
    } else {
      url = img.src || img.getAttribute("data-cfsrc") || "";
    }
    if (!url) throw new Error("Cannot find origin image or video url");
    let title: string | undefined;
    // extract ext from url
    const ext = url.split(".").pop()?.match(/^\w+/)?.[0];
    // extract id from href
    const id = href.match(/id=(\d+)/)?.[1];
    if (ext && id) {
      title = `${id}.${ext}`;
    }
    return { url, title };
  }

  public async parseImgNodes(source: PagesSource): Promise<ImageNode[] | never> {
    const list: ImageNode[] = [];
    const doc = source as Document;
    const imgList = Array.from(doc.querySelectorAll<HTMLAnchorElement>(".image-list > .thumb:not(.blacklisted-image) > a"));
    for (const img of imgList) {
      const child = img.querySelector<HTMLImageElement>("img");
      if (!child) {
        evLog("error", "warn: cannot find img element", img);
        continue;
      }
      const title = `${img.id}.jpg`;
      if (child.alt !== undefined && child.alt !== "") {
        this.tags[img.id] = child.alt.split(" ").map(v => v.trim()).filter(v => v !== "");
        this.count++;
      }
      list.push(new ImageNode(child.src, img.href, title));
    }
    return list;
  }

  galleryMeta(): GalleryMeta {
    const url = new URL(window.location.href);
    const tags = url.searchParams.get("tags")?.trim();
    const meta = new GalleryMeta(window.location.href, `rule34_${tags}_${this.count}`);
    meta.tags = this.tags;
    return meta;
  }
}
