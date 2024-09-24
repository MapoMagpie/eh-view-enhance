import ImageNode from '../img-node';
import { BaseMatcher, OriginMeta } from './platform';

export class ArcaMatcher extends BaseMatcher<Document> {
  name(): string {
    return 'Arcalive';
  }
  async *fetchPagesSource(): AsyncGenerator<Document> {
    yield document;
  }
  async parseImgNodes(doc: Document): Promise<ImageNode[]> {
    const imageString = '.article-content img:not(.arca-emoticon):not(.twemoji)';
    const videoString = '.article-content video:not(.arca-emoticon)';

    const elements = Array.from(doc.querySelectorAll<HTMLElement>(`${imageString}, ${videoString}`));
    const nodes: ImageNode[] = [];
    const digits = elements.length.toString().length;

    elements.forEach((element, i) => {
      if (element.tagName.toLowerCase() === 'img') {
        const img = element as HTMLImageElement;
        if (img.src && img.style.width !== '0px') {
          const src = img.src;
          const href = new URL(src);
          const ext = href.pathname.split('.').pop();
          href.searchParams.set('type', 'orig');
          const title = (i + 1).toString().padStart(digits, '0') + '.' + ext;
          nodes.push(new ImageNode(src, href.href, title, undefined, href.href));
        }
      } else if (element.tagName.toLowerCase() === 'video') {
        const video = element as HTMLVideoElement;
        if (video.src) {
          const src = video.src;
          const href = new URL(src);
          const ext = href.pathname.split('.').pop();
          href.searchParams.set('type', 'orig');
          const title = (i + 1).toString().padStart(digits, '0') + '.' + ext;
          const poster = video.poster || '';
          nodes.push(new ImageNode(poster, href.href, title, undefined, href.href));
        }
      }
    });

    return nodes;
  }
  async fetchOriginMeta(node: ImageNode): Promise<OriginMeta> {
    return { url: node.href };
  }
  workURL(): RegExp {
    return /arca.live\/b\/\w*\/\d+/;
  }
}
