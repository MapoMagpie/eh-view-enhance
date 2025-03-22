import { GalleryMeta } from "../download/gallery-meta";
import ImageNode from "../img-node";
import { BaseMatcher, OriginMeta, Result } from "./platform";

export class WnacgMatcher extends BaseMatcher<Document> {
  name(): string {
    return "绅士漫画"
  }

  meta?: GalleryMeta;
  baseURL?: string;
  galleryURL?: string;
  galleryImageList: GalleryImage[] = [];

  async *fetchPagesSource(): AsyncGenerator<Result<Document>> {
    const id = this.extractIDFromHref(window.location.href);
    if (!id) {
      throw new Error("Cannot find gallery ID");
    }
    this.baseURL = `${window.location.origin}/photos-index-page-1-aid-${id}.html`;
    this.galleryURL = `${window.location.origin}/photos-gallery-aid-${id}.html`;
    await this.requestGalleryImages(this.galleryURL);

    let doc = await window.fetch(this.baseURL).then((res) => res.text()).then((text) => new DOMParser().parseFromString(text, "text/html"));
    this.meta = this.pasrseGalleryMeta(doc);
    yield Result.ok(doc);
    while (true) {
      const next = doc.querySelector<HTMLAnchorElement>(".paginator > .next > a");
      if (!next) break;
      const url = next.href;
      doc = await window.fetch(url).then((res) => res.text()).then((text) => new DOMParser().parseFromString(text, "text/html"));
      yield Result.ok(doc);
    }
  }

  async parseImgNodes(doc: Document): Promise<ImageNode[]> {
    
    let pageNum : number= this.extractPageNum(doc);

    const result: ImageNode[] = [];
    const list = Array.from(doc.querySelectorAll(".grid > .gallary_wrap > .cc > li"));
    const listSize = list.length;
    for (let index = 0; index < list.length; index++) {
      const li = list[index];
      
      const anchor = li.querySelector<HTMLAnchorElement>(".pic_box > a");
      if (!anchor) continue;
      const img = anchor.querySelector<HTMLImageElement>("img");
      if (!img) continue;
      const title = li.querySelector(".title > .name")?.textContent || "unknown";
      let imgNode=new ImageNode(img.src, anchor.href, title);
      imgNode.imgIndex = ((pageNum - 1) * listSize) + index;
   
      result.push(imgNode);
    }
    return result;
  }

  async fetchOriginMeta(node: ImageNode): Promise<OriginMeta> {
    let idx = node.imgIndex
    if (idx != null && idx >= 0) {
      let img = this.galleryImageList[idx];
      console.log(`idx = ${idx}, img = ${img}`);
      const url = img.url;
      const title = img.caption;
      return { url, title }
    } 

    const doc = await window.fetch(node.href).then((res) => res.text()).then((text) => new DOMParser().parseFromString(text, "text/html"));
    const img = doc.querySelector<HTMLImageElement>("#picarea")
    if (!img) throw new Error(`Cannot find #picarea from ${node.href}`);
    const url = img.src;
    const title = url.split("/").pop();
    return { url, title }
  }

  workURL(): RegExp {
    return /(wnacg.com|wn\d{2}.cc)\/photos-index/;
  }

  galleryMeta(doc: Document): GalleryMeta {
    return this.meta || super.galleryMeta(doc);
  }

  // https://www.hm19.lol/photos-index-page-1-aid-253297.html
  private extractIDFromHref(href: string): string | undefined {
    const match = href.match(/-(\d+).html$/);
    if (!match) return undefined;
    return match[1];
  }

  private pasrseGalleryMeta(doc: Document): GalleryMeta {
    const title = doc.querySelector<HTMLTitleElement>("#bodywrap > h2")?.textContent || "unknown";
    const meta = new GalleryMeta(this.baseURL || window.location.href, title);
    const tags = Array.from(doc.querySelectorAll(".asTB .tagshow")).map(ele => ele.textContent).filter(Boolean);
    const description = Array.from(doc.querySelector(".asTB > .asTBcell.uwconn > p")?.childNodes || []).map(e => e.textContent).filter(Boolean) as string[];
    meta.tags = { "tags": tags, "description": description }
    return meta;
  }

  private extractPageNum(doc: Document): number {
    let t = doc.querySelector(".paginator > .thispage")?.textContent;
    if (t) {
      return parseInt(t);
    }
    return 0;
  }

  private requestGalleryImages(galleryURL: string): Promise<void> {
    return new Promise<void>((resolve, reject) => {
      window.fetch(galleryURL)
        .then((res) => res.text())
        .then((text) => {
          /*
document.writeln("	<script type=\"text/javascript\">
    ");
document.writeln("		var sns_sys_id = '';");
document.writeln("		var sns_view_point_token = '';");
document.writeln("		var hash = window.location.hash;");
document.writeln("		if(!hash){");
document.writeln("			hash = 0;");
document.writeln("		}else{");
document.writeln("			hash = parseInt(hash.replace(\"#\",\"\")) - 1;");
document.writeln("		}");
document.writeln("		var fast_img_host=\"\";");
document.writeln("		var imglist = [{ url: fast_img_host+\"//img5.qy0.ru/data/2940/25/001.jpg\", caption: \"[001]\"},{ url: fast_img_host+\"/themes/weitu/images/bg/shoucang.jpg\", caption: \"喜歡紳士漫畫的同學請加入收藏哦！\"}];");
document.writeln("");
document.writeln("		$(function(){");
document.writeln("			imgscroll.beLoad($(\"#img_list\"),imglist,hash);");
document.writeln("		});");
document.writeln("	
</script>
");
*/
          let js = "";
          for (let line of text.split("\n")) {
            line = line.replace("document.writeln(\"", "");
            line = line.replace("\");", "");
            if (line.includes("var imglist")) {
              line = line.replace("var imglist = ", "");
              line = line.replaceAll("fast_img_host+\\", "");
              line = line.replaceAll("\\", "");
              js += line;
            }
          }
          console.log(js);
          console.log("js eval 1");
          var imglist = this.extractUrlsAndCaptions(js);
          console.log("js eval 2");
          console.log(imglist);
          this.galleryImageList = imglist;
          resolve()
        }).catch(reject);
    })
  }


  private extractUrlsAndCaptions(inputStr: string) {
    const regex = /url:\s*"(.*?)",\s*caption:\s*"(.*?)"/gs;
    let match;
    const results = [];

    while ((match = regex.exec(inputStr)) !== null) {
        results.push({ url: match[1], caption: match[2] });
    }

    return results;
  }

}

class GalleryImage {
  url: string;
  caption: string;
  constructor(url: string, caption: string) {
    this.url = url;
    this.caption = caption;
  }
}
