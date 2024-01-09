import { GalleryMeta } from "../download/gallery-meta";
import { Matcher, PagesSource } from "./platform";

// type Work = {
//   // id: "114970872",
//   id: string,
//   // title: "\u9cf6\u4e00\u6298\u7d19  \u4e71\u4ea4",
//   title: string,
//   // illustType: 0,
//   /// 0: illustration, 1: manga, 2: ugoira
//   illustType: 0 | 1 | 2,
//   // xRestrict: 1,
//   // restrict: 0,
//   // sl: 6,
//   // url: "https:\/\/i.pximg.net\/c\/250x250_80_a2\/img-master\/img\/2024\/01\/07\/20\/08\/08\/114970872_p0_square1200.jpg",
//   url: string,
//   // description: "",
//   // userId: "17488842",
//   // userName: "Tamayuki",
//   // width: 832,
//   // height: 1216,
//   // pageCount: 35,
//   pageCount: number,
//   // isBookmarkable: true,
//   // bookmarkData: null,
//   // alt: "\u9cf6\u4e00\u6298\u7d19  \u4e71\u4ea4 \/ January 7th, 2024",
//   // titleCaptionTranslation: {
//   //   "workTitle": null,
//   //   "workCaption": null
//   // },
//   // createDate: "2024-01-07T20:08:08+09:00",
//   // updateDate: "2024-01-07T20:08:08+09:00",
//   // isUnlisted: false,
//   // isMasked: false,
//   // aiType: 2,
//   /// 0: no, 1: partial, 2: full
//   // aiType: 2,
//   // profileImageUrl: "https:\/\/i.pximg.net\/user-profile\/img\/2023\/10\/11\/04\/19\/40\/25035114_b739a0fa366fab0190dcfc0d380c20d5_50.png"
// }

// type Works = {
//   body: {
//     works: Record<string, Work>
//   }
// }

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

// const PIXIV_EXTRACT_PID_INFO = /^(\d+)\/http.*?\/img\/((\d+\/)+\d+)\/(\d+(_p\d*)?).*?\.(\w+)/;
export class Pixiv implements Matcher {

  public parseGalleryMeta(_: Document): GalleryMeta {
    return new GalleryMeta(window.location.href, "UNTITLE");
  }

  // url: https://i.pximg.net/c/250x250_80_a2/img-master/img/2024/01/07/20/08/08/114970872_p0_square1200.jpg
  // return: https://i.pximg.net/img-original/img/2024/01/07/20/08/08/114970872_p0.png
  public async matchImgURL(url: string, _: boolean): Promise<string> {
    // const matchs = url.match(PIXIV_EXTRACT_PID_INFO);
    // if (matchs === null) throw new Error(`[matchs] is null, url: ${url}`);
    // if (matchs.length < 7) throw new Error(`[matchs] length is less than 7, url: ${url}`);
    // const num = matchs[1];
    // const date = matchs[2];
    // const pid = matchs[4].replace("_p0", "_p" + num);
    // // const ext = matchs[5];
    // return `https://i.pximg.net/img-original/img/${date}/${pid}.png`;
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
    // split illusts to 10 per page
    // let i = -1;
    while (pidList.length > 0) {
      // i++;
      const pids = pidList.splice(0, 10);
      // request illusts from https://www.pixiv.net/ajax/user/{author}/profile/illusts?ids[]=1&ids[]=2&work_category=illust&is_first_page=1
      // work_category: illustManga | ugoira | illust | manga | novel
      // const res = await window.fetch(`https://www.pixiv.net/ajax/user/${author}/profile/illusts?ids[]=${pids.join("&ids[]=")}&work_category=illustManga&is_first_page=${i == 0 ? "1" : "0"}`).then(resp => resp.text());
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
