import pica, { PicaResizeOptions } from "pica";

const PICA = new pica({ features: ["js", "wasm"], });
const PICA_OPTION: PicaResizeOptions = { filter: "box" };

export async function resizing(from: HTMLImageElement, to: HTMLCanvasElement): Promise<void> {
  return PICA.resize(from, to, PICA_OPTION).then();
}
