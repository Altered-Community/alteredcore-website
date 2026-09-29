/**
 * Reads one file out of a ZIP archive in the browser: central directory lookup, then the entry
 * stored as is or inflated with `DecompressionStream('deflate-raw')`. No ZIP64, no encryption:
 * enough for the altered.gg personal-data export.
 */

const EOCD = 0x06054b50;
const CENTRAL = 0x02014b50;
const LOCAL = 0x04034b50;
/** End of central directory record without comment, plus the longest comment. */
const EOCD_SEARCH = 22 + 0xffff;

export class ZipError extends Error {}

/** Text of the first entry whose file name (any folder) is `name`; `null` when there is none. */
export async function readZipText(file: Blob, name: string): Promise<string | null> {
  const tailStart = Math.max(0, file.size - EOCD_SEARCH);
  const tail = new DataView(await file.slice(tailStart).arrayBuffer());
  let eocd = -1;
  for (let i = tail.byteLength - 22; i >= 0; i--) {
    if (tail.getUint32(i, true) === EOCD) {
      eocd = i;
      break;
    }
  }
  if (eocd < 0) throw new ZipError('not a zip archive');
  const count = tail.getUint16(eocd + 10, true);
  const cdSize = tail.getUint32(eocd + 12, true);
  const cdOffset = tail.getUint32(eocd + 16, true);
  const cd = new DataView(await file.slice(cdOffset, cdOffset + cdSize).arrayBuffer());
  const decoder = new TextDecoder();
  for (let p = 0, n = 0; n < count && p + 46 <= cd.byteLength; n++) {
    if (cd.getUint32(p, true) !== CENTRAL) throw new ZipError('corrupt central directory');
    const method = cd.getUint16(p + 10, true);
    const compressedSize = cd.getUint32(p + 20, true);
    const nameLength = cd.getUint16(p + 28, true);
    const extraLength = cd.getUint16(p + 30, true);
    const commentLength = cd.getUint16(p + 32, true);
    const localOffset = cd.getUint32(p + 42, true);
    const path = decoder.decode(new Uint8Array(cd.buffer, cd.byteOffset + p + 46, nameLength));
    p += 46 + nameLength + extraLength + commentLength;
    if (path.split('/').pop() !== name) continue;
    const local = new DataView(await file.slice(localOffset, localOffset + 30).arrayBuffer());
    if (local.getUint32(0, true) !== LOCAL) throw new ZipError('corrupt local header');
    const start = localOffset + 30 + local.getUint16(26, true) + local.getUint16(28, true);
    const data = file.slice(start, start + compressedSize);
    if (method === 0) return data.text();
    if (method !== 8) throw new ZipError(`unsupported compression method ${method}`);
    const inflated = new Response(await data.arrayBuffer()).body!.pipeThrough(new DecompressionStream('deflate-raw'));
    return new Response(inflated).text();
  }
  return null;
}
