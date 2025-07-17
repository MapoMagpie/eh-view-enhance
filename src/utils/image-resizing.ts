import pica, { PicaResizeOptions } from "pica";

const PICA = new pica({ features: ["wasm"], });
const PICA_OPTION: PicaResizeOptions = { filter: "box" };

export async function resizing(from: HTMLCanvasElement | HTMLImageElement | ImageBitmap, to: HTMLCanvasElement): Promise<void> {
  return PICA.resize(from, to, PICA_OPTION).then();
}
