export class GalleryMeta {
  url: string;
  title?: string;
  originTitle?: string;
  tags: Record<string, any[]>;
  constructor(url: string, title: string) {
    this.url = url;
    this.title = title;
    this.tags = {};
  }
}
