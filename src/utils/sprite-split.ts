import { fetchImage } from "./query";

export type ImagePosition = {
  x: number;
  y: number;
  width: number;
  height: number;
};

export function parseImagePositions(styles: CSSStyleDeclaration[]): ImagePosition[] {
  return styles.map((st) => {
    const [x, y] = st.backgroundPosition.split(" ").map((v) => Math.abs(parseInt(v)));
    return { x, y, width: parseInt(st.width), height: parseInt(st.height) };
  });
}

export function splitSpriteImage(image: HTMLImageElement, positions: ImagePosition[]): string[] {
  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d")!;
  const result: string[] = [];
  for (const pos of positions) {
    canvas.width = pos.width;
    canvas.height = pos.height;
    ctx.drawImage(image, pos.x, pos.y, pos.width, pos.height, 0, 0, pos.width, pos.height);
    result.push(canvas.toDataURL()); // broken image in tor browser, don't why
  }
  canvas.remove();
  return result;
}

export async function splitImagesFromUrl(url: string, positions: ImagePosition[]): Promise<string[]> {
  let data: Blob | undefined;
  for (let i = 0; i < 3; i++) {
    try {
      data = await fetchImage(url);
      break;
    } catch (err) { }
  }
  if (!data) throw new Error("load sprite image error");
  url = URL.createObjectURL(data);
  const img: HTMLImageElement = await new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("load sprite image error"));
    img.src = url;
  });
  URL.revokeObjectURL(url);
  return splitSpriteImage(img, positions);
}
