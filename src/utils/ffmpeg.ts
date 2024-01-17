import class_worker_raw from "../utils/ffmpeg-worker/worker.js?raw"
import core_raw from "../utils/ffmpeg-worker/ffmpeg-core.js?raw"
import { FFmpeg } from "@ffmpeg/ffmpeg";
import { toBlobURL } from "@ffmpeg/util";

export type FileData = {
  name: string,
  data: Uint8Array
}
export type FrameMeta = { file: string, delay: number }[];

export class FFmpegConvertor {

  coreURL?: string;
  wasmURL?: string;
  classWorkerURL?: string;
  ffmpeg?: FFmpeg;

  async init(): Promise<FFmpegConvertor> {
    const en = new TextEncoder();
    this.coreURL = URL.createObjectURL(new Blob([en.encode(core_raw)], { type: 'text/javascript' }));
    this.classWorkerURL = URL.createObjectURL(new Blob([en.encode(class_worker_raw)], { type: 'text/javascript' }));
    this.wasmURL = await toBlobURL(`https://unpkg.com/@ffmpeg/core@0.12.6/dist/esm/ffmpeg-core.wasm`, 'application/wasm');
    const ffmpeg = new FFmpeg();
    await ffmpeg.load(
      {
        coreURL: this.coreURL,
        wasmURL: this.wasmURL,
        classWorkerURL: this.classWorkerURL,
      }
    );
    this.ffmpeg = ffmpeg;
    return this;
  }

  check() {
    if (!this.coreURL || !this.wasmURL || !this.classWorkerURL || !this.ffmpeg) {
      throw new Error("FFmpegConvertor not init");
    }
  }

  async convertToGif(files: FileData[], meta?: FrameMeta): Promise<Blob> {
    this.check();
    const ffmpeg = this.ffmpeg!;
    const randomPrefix = Math.random().toString(36).substring(7);
    const resultFile = randomPrefix + 'output.gif';

    await Promise.all(
      files.map(async (f) => {
        await ffmpeg.writeFile(randomPrefix + f.name, f.data);
      })
    );

    if (meta) {
      const metaStr = meta.map(m => `file '${randomPrefix}${m.file}'\nduration ${m.delay / 1000}`).join('\n');
      await ffmpeg.writeFile('meta.txt', metaStr);
      await ffmpeg.exec(['-f', 'concat', '-safe', '0', '-i', 'meta.txt', resultFile]);
    } else {
      const inputPattern = `%0${files[0].name.length}d.${files[0].name.split('.').pop()}`;
      await ffmpeg.exec(['-f', 'image2', '-framerate', '5', '-i', inputPattern, resultFile]);
    }

    // ffmpeg -y -i "input.mp4" -filter_complex "[0:v]fps=5,split[a][b];[b]palettegen[p];[a][p]paletteuse,setpts=0.5*PTS[v]" -map '[v]' "output.mp4"
    const result = await ffmpeg.readFile(resultFile);

    // delete temp files
    await Promise.all(
      files.map(async (f) => {
        await ffmpeg.deleteFile(randomPrefix + f.name);
      })
    );

    return new Blob([result], { type: 'image/gif' });
  }
}
