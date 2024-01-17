import { evLog } from "./ev-log";

class Crc32 {
  crc: number = -1;
  table: number[] = this.makeTable();
  makeTable(): number[] {
    let i: number;
    let j: number;
    let t: number;
    let table = []
    for (i = 0; i < 256; i++) {
      t = i
      for (j = 0; j < 8; j++) {
        t = (t & 1)
          ? (t >>> 1) ^ 0xEDB88320
          : t >>> 1
      }
      table[i] = t
    }
    return table
  }
  append(data: Uint8Array) {
    let crc = this.crc | 0;
    let table = this.table
    for (let offset = 0, len = data.length | 0; offset < len; offset++) {
      crc = (crc >>> 8) ^ table[(crc ^ data[offset]) & 0xFF]
    }
    this.crc = crc
  }
  get() {
    return ~this.crc
  }
}

export interface FileLike {
  size(): number;
  stream(): Promise<ReadableStream<Uint8Array>>;
  name: string;
}

class ZipObject {
  level: number;
  nameBuf: Uint8Array;
  comment: Uint8Array;
  header: DataHelper;
  offset: number;
  directory: boolean;
  file: FileLike
  crc: Crc32;
  compressedLength: number;
  uncompressedLength: number;
  volumeNo: number;

  constructor(file: FileLike, volumeNo: number) {
    this.level = 0;
    const encoder = new TextEncoder();
    this.nameBuf = encoder.encode(file.name.trim());
    this.comment = encoder.encode('');
    this.header = new DataHelper(26);
    this.offset = 0;
    this.directory = false;
    this.file = file;
    this.crc = new Crc32();
    this.compressedLength = 0;
    this.uncompressedLength = 0;
    this.volumeNo = volumeNo;
  }
}

class DataHelper {
  array: Uint8Array;
  view: DataView;
  constructor(byteLength: number) {
    let uint8 = new Uint8Array(byteLength)
    this.array = uint8;
    this.view = new DataView(uint8.buffer)
  }
}

export class Zip {
  // default 1.5GB
  private volumeSize: number = 0x60000000;
  private accumulatedSize: number = 0;
  volumes: number = 1;
  currVolumeNo: number = -1;
  private files: ZipObject[] = [];
  private currIndex: number = -1;
  private offset: number = 0;
  private offsetInVolume: number = 0;
  private curr?: ZipObject;
  private date: Date;
  private writer: (chunk?: Uint8Array) => Promise<void>;
  close: boolean = false;

  constructor(settings?: { volumeSize?: number }) {
    if (settings?.volumeSize) {
      this.volumeSize = settings.volumeSize;
    }
    this.date = new Date(Date.now());
    this.writer = async () => { };
  }

  setWriter(writer: (chunk?: Uint8Array) => Promise<void>) {
    this.writer = writer;
  }

  add(file: FileLike) {
    const fileSize = file.size();
    this.accumulatedSize += fileSize;
    if (this.accumulatedSize > this.volumeSize) {
      this.volumes++;
      this.accumulatedSize = fileSize;
    }
    this.files.push(new ZipObject(file, this.volumes - 1));
  }

  public async next(): Promise<boolean> {
    this.currIndex++;
    this.curr = this.files[this.currIndex];
    if (this.curr) {
      if (this.curr.volumeNo > this.currVolumeNo) {
        this.currIndex--;
        this.offsetInVolume = 0;
        return true;
      }
      this.curr.offset = this.offsetInVolume;
      await this.writeHeader();
      await this.writeContent();
      await this.writeFooter();
      this.offset += this.offsetInVolume - this.curr.offset;
    } else if (!this.close) {
      this.close = true;
      await this.closeZip();
    } else {
      return true;
    }
    return false;
  }

  private async writeHeader() {
    if (!this.curr) return;
    const curr = this.curr;
    let data = new DataHelper(30 + curr.nameBuf.length);
    let header = curr.header;
    if (curr.level !== 0 && !curr.directory) {
      header.view.setUint16(4, 0x0800);
    }
    header.view.setUint32(0, 0x14000808);
    header.view.setUint16(6, (((this.date.getHours() << 6) | this.date.getMinutes()) << 5) | this.date.getSeconds() / 2, true);
    header.view.setUint16(8, ((((this.date.getFullYear() - 1980) << 4) | (this.date.getMonth() + 1)) << 5) | this.date.getDate(), true);
    header.view.setUint16(22, curr.nameBuf.length, true);
    data.view.setUint32(0, 0x504b0304);
    data.array.set(header.array, 4);
    data.array.set(curr.nameBuf, 30);
    this.offsetInVolume += data.array.length;
    await this.writer(data.array);
  }

  private async writeContent() {
    const curr = this.curr!;
    const reader = (await curr.file.stream()).getReader();
    const writer = this.writer;

    async function pump() {
      const chunk = await reader.read();
      if (chunk.done) {
        return;
      }

      const data = chunk.value;
      curr.crc.append(data);
      curr.uncompressedLength += data.length;
      curr.compressedLength += data.length;
      writer(data);

      return await pump();
    }

    await pump();
  }

  private async writeFooter() {
    if (!this.curr) return;
    const curr = this.curr;
    var footer = new DataHelper(16);
    footer.view.setUint32(0, 0x504b0708);

    if (curr.crc) {
      curr.header.view.setUint32(10, curr.crc.get(), true);
      curr.header.view.setUint32(14, curr.compressedLength, true);
      curr.header.view.setUint32(18, curr.uncompressedLength, true);
      footer.view.setUint32(4, curr.crc.get(), true);
      footer.view.setUint32(8, curr.compressedLength, true);
      footer.view.setUint32(12, curr.uncompressedLength, true);
    }

    await this.writer(footer.array);
    this.offsetInVolume += curr.compressedLength + 16;
    if (curr.compressedLength !== curr.file.size()) {
      evLog("WRAN: read length:", curr.compressedLength, " origin size:", curr.file.size(), ", title: ", curr.file.name);
    }
  }

  private async closeZip() {
    const fileCount = this.files.length;;
    // Central directory size 
    let centralDirLength = 0;
    let idx = 0;

    for (idx = 0; idx < fileCount; idx++) {
      const file = this.files[idx];
      centralDirLength += 46 + file.nameBuf.length + file.comment.length;
    }

    const data = new DataHelper(centralDirLength + 22);
    let dataOffset = 0;
    for (idx = 0; idx < fileCount; idx++) {
      const file = this.files[idx];
      data.view.setUint32(dataOffset, 0x504b0102);
      data.view.setUint16(dataOffset + 4, 0x1400);
      data.array.set(file.header.array, dataOffset + 6);
      data.view.setUint16(dataOffset + 32, file.comment.length, true);
      data.view.setUint16(dataOffset + 34, file.volumeNo, true); // disk number start
      data.view.setUint32(dataOffset + 42, file.offset, true);
      data.array.set(file.nameBuf, dataOffset + 46);
      data.array.set(file.comment, dataOffset + 46 + file.nameBuf.length);
      dataOffset += 46 + file.nameBuf.length + file.comment.length;
    }
    data.view.setUint32(dataOffset, 0x504b0506);
    data.view.setUint16(dataOffset + 4, this.currVolumeNo, true); // disk number
    data.view.setUint16(dataOffset + 6, this.currVolumeNo, true); // disk # of central dir
    data.view.setUint16(dataOffset + 8, fileCount, true);
    data.view.setUint16(dataOffset + 10, fileCount, true);
    data.view.setUint32(dataOffset + 12, centralDirLength, true);
    data.view.setUint32(dataOffset + 16, this.offsetInVolume, true);
    await this.writer(data.array);
  }

  nextReadableStream(): ReadableStream<Uint8Array> | undefined {
    this.currVolumeNo++;
    if (this.currVolumeNo >= this.volumes) {
      return;
    }
    const zip = this;
    return new ReadableStream<Uint8Array>({
      start(controller) {
        zip.setWriter(async (chunk) => controller.enqueue(chunk));
      },
      async pull(controller) {
        await zip.next().then(done => done && controller.close());
      },
    });
  }

}
