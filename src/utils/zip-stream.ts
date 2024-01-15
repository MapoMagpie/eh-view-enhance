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

class ZipObject {
  level: number;
  nameBuf: Uint8Array;
  comment: Uint8Array;
  header: DataHelper;
  offset: number;
  directory: boolean;
  file: File
  crc: Crc32;
  compressedLength: number;
  uncompressedLength: number;

  constructor(file: File) {
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

  private files: ZipObject[] = [];
  private currIndex: number = -1;
  private offset: number = 0;
  private curr?: ZipObject;
  private date: Date;
  private writer: (chunk?: Uint8Array) => Promise<void>;
  close: boolean = false;

  constructor() {
    this.date = new Date(Date.now());
    this.writer = async () => { };
  }

  setWriter(writer: (chunk?: Uint8Array) => Promise<void>) {
    this.writer = writer;
  }

  append(file: File) {
    this.files.push(new ZipObject(file));
  }

  public async next(): Promise<boolean> {
    this.currIndex++;
    this.curr = this.files[this.currIndex];
    if (this.curr) {
      this.curr.offset = this.offset;
      await this.writeHeader();
      await this.writeContent();
      await this.writeFooter();
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
    this.offset += data.array.length;
    await this.writer(data.array);
  }

  private async writeContent() {
    const curr = this.curr!;
    const reader = curr.file.stream().getReader();
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
    this.offset += curr.compressedLength + 16;

  }

  private async closeZip() {
    const fileCount = this.files.length;;
    let length = 0;
    let idx = 0;

    for (idx = 0; idx < fileCount; idx++) {
      const file = this.files[idx];
      length += 46 + file.nameBuf.length + file.comment.length;
    }

    const data = new DataHelper(length + 22);
    let dataOffset = 0;
    for (idx = 0; idx < fileCount; idx++) {
      const file = this.files[idx];
      data.view.setUint32(dataOffset, 0x504b0102);
      data.view.setUint16(dataOffset + 4, 0x1400);
      data.array.set(file.header.array, dataOffset + 6);
      data.view.setUint16(dataOffset + 32, file.comment.length, true);
      data.view.setUint32(dataOffset + 42, file.offset, true);
      data.array.set(file.nameBuf, dataOffset + 46);
      data.array.set(file.comment, dataOffset + 46 + file.nameBuf.length);
      dataOffset += 46 + file.nameBuf.length + file.comment.length;
    }
    data.view.setUint32(dataOffset, 0x504b0506);
    data.view.setUint16(dataOffset + 8, fileCount, true);
    data.view.setUint16(dataOffset + 10, fileCount, true);
    data.view.setUint32(dataOffset + 12, length, true);
    data.view.setUint32(dataOffset + 16, this.offset, true);
    await this.writer(data.array);
  }

}

export function createReadableStream(underlyingSource: UnderlyingSource<File>) {
  const zip = new Zip();
  return new ReadableStream<Uint8Array>({
    start(controller) {
      zip.setWriter(async (chunk) => controller.enqueue(chunk));
      underlyingSource.start?.({
        desiredSize: null,
        close: function(): void {
          console.log("underlyingSource close");
        },
        enqueue: function(file: File): void {
          zip.append(file);
        },
        error: function(e?: Error): void {
          console.error("underlyingSource error", e);
        }
      });
    },
    async pull(controller) {
      await zip.next().then(done => done && controller.close());
    },
  });
}
