import { GalleryMeta } from "../download/gallery-meta";
import ImageNode from "../img-node";
import { Chapter } from "../page-fetcher";
import { BaseMatcher, OriginMeta, Result } from "./platform";

type EahentaiGalleryData = {
  albumID: number,
  addDt: string,
  thumbnailUri: string, // 
  imageUri: string,
  title: string,
  tags: string,
  from: string,
  characters: string,
  author: string,
  albumType: string,
  images: EahentaiGalleryImage[],
}

type EahentaiGalleryImage = {
  imageId: number,
  addDt: string,
  imageUri: string,
  thumbnailUri: string,
  title: string,
  author: string,
  sort: number,
}

function eahentaiGetURL(uri: string) {
  return 'https://i.eahentai.com/file/ea-gallery/' + encodeURI(uri).replace(/,/g, '%2C').replace(/&/g, '%26').replace(/\+/g, '%2B').replace(/%20/g, '+');
}
export class EahentaiMatcher extends BaseMatcher<EahentaiGalleryData> {
  name(): string {
    return "eahentai";
  }
  workURL(): RegExp {
    return /eahentai.com\/a\/\d+\/?$/;
  }

  meta?: GalleryMeta;

  async *fetchPagesSource(): AsyncGenerator<Result<EahentaiGalleryData>> {
    const galleryID = window.location.href.match(/eahentai.com\/a\/(\d+)/)?.[1];
    if (!galleryID) throw new Error("cannot get gallery id from url: " + window.location.href);
    const api = `${window.location.origin}/api/image/album/${galleryID}`;
    const data = await window.fetch(api, { "referrer": window.location.href, }).then(resp => resp.json()) as EahentaiGalleryData[];
    if (!data || data.length === 0) throw new Error("cannot fetch album data from: " + api);
    const data1 = data[0];

    // gallery meta
    const meta = new GalleryMeta(window.location.href, data1.title);
    meta.tags["tags"] = data1.tags.split("|");
    meta.tags["author"] = [data1.author];
    meta.tags["albumType"] = data1.albumType.split("|");
    meta.tags["characters"] = data1.characters?.split("|") ?? [];
    this.meta = meta;

    yield Result.ok(data[0]);
  }

  async parseImgNodes(data: EahentaiGalleryData): Promise<ImageNode[]> {
    return data.images.map((img, i) => {
      const thumb = eahentaiGetURL(img.thumbnailUri);
      const href = `${window.location.origin}/a/${data.albumID}/${i}`;
      const ext = img.imageUri.split(".").pop() ?? "jpg";
      const origin = eahentaiGetURL(img.imageUri);
      return new ImageNode(thumb, href, img.title + "." + ext, undefined, origin);
    });
  }

  async fetchOriginMeta(node: ImageNode): Promise<OriginMeta> {
    return { url: node.originSrc! };
  }

  galleryMeta(chapter: Chapter): GalleryMeta {
    return this.meta ?? super.galleryMeta(chapter);
  }

}
