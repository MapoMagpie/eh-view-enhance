import { GalleryMeta } from "../download/gallery-meta";
import { Matcher, PagesSource } from "./platform";

type Page = {
  urls: {
    thumb_mini: string,
    small: string,
    regular: string,
    original: string,
  },
  width: number,
  height: number
}

const HASH_REGEX = /pixiv\.net\/(\w*\/)?(artworks|users)\/.*/;
export class Pixiv implements Matcher {

  work(url: string): boolean {
    return HASH_REGEX.test(url);
  }

  public parseGalleryMeta(_: Document): GalleryMeta {
    // TODO: collect meta
    return new GalleryMeta(window.location.href, "UNTITLE");
  }

  public async matchImgURL(url: string, _: boolean): Promise<string> {
    return url
  }

  public async parseImgNodes(raw: PagesSource, template: HTMLElement): Promise<HTMLElement[]> {
    const list: HTMLElement[] = [];
    const pidList = JSON.parse(raw.raw as string) as string[];
    const pageListData = await fetchUrls(pidList.map(p => `https://www.pixiv.net/ajax/illust/${p}/pages?lang=en`), 5);
    for (let i = 0; i < pidList.length; i++) {
      const pid = pidList[i];
      const pages = JSON.parse(pageListData[i]).body as Page[];
      let digits = pages.length.toString().length;
      let j = -1;
      for (const p of pages) {
        j++;
        const newImgNode = template.cloneNode(true) as HTMLDivElement;
        const newImg = newImgNode.firstElementChild as HTMLImageElement;
        newImg.setAttribute("ahref", p.urls.original);
        newImg.setAttribute("asrc", p.urls.small);
        newImg.setAttribute("title", p.urls.original.split("/").pop() || `${pid}_p${j.toString().padStart(digits)}.jpg`);
        list.push(newImgNode);
      }
    }
    return list;
  }

  public async *fetchPagesSource(): AsyncGenerator<PagesSource> {
    // find author eg. https://www.pixiv.net/en/users/7210261
    let u = document.querySelector<HTMLAnchorElement>("a[data-gtm-value][href*='/users/']")?.href || window.location.href;
    const author = /users\/(\d+)/.exec(u)?.[1];
    if (!author) {
      // throw new Error("Cannot find author id!");
      // TODO: log this
      return;
    }
    // request all illusts from https://www.pixiv.net/ajax/user/{author}/profile/all
    const res = await window.fetch(`https://www.pixiv.net/ajax/user/${author}/profile/all`).then(resp => resp.json());
    if (res.error) {
      // TODO: log this
      return;
    }
    let pidList = [...Object.keys(res.body.illusts), ...Object.keys(res.body.manga)];
    pidList = pidList.sort((a, b) => parseInt(b) - parseInt(a));
    while (pidList.length > 0) {
      const pids = pidList.splice(0, 10);
      yield { raw: JSON.stringify(pids), typ: "json" }
    }

  }
}

async function fetchUrls(urls: string[], concurrency: number): Promise<string[]> {
  const results = new Array(urls.length);
  let i = 0;
  while (i < urls.length) {
    const batch = urls.slice(i, i + concurrency);
    const batchPromises = batch.map((url, index) =>

      window.fetch(url).then((resp) => {
        if (resp.ok) {
          return resp.text();
        }
        throw new Error(`Failed to fetch ${url}: ${resp.status} ${resp.statusText}`);
      }).then(raw => results[index + i] = raw)

    );

    await Promise.all(batchPromises);
    i += concurrency;
  }
  return results;
}
