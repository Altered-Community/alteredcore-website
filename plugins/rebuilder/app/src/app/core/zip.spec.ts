import { ZipError, readZipText } from './zip';

/**
 * A minimal ZIP writer for the tests: entries stored (method 0) or deflated (method 8). `size`
 * overrides the declared uncompressed size.
 */
async function zip(entries: { name: string; text: string; deflate?: boolean; size?: number }[]): Promise<Blob> {
  const enc = new TextEncoder();
  const parts: Uint8Array[] = [];
  const central: Uint8Array[] = [];
  let offset = 0;
  for (const e of entries) {
    const name = enc.encode(e.name);
    const raw = enc.encode(e.text);
    const data = e.deflate ? new Uint8Array(await new Response(new Response(raw).body!.pipeThrough(new CompressionStream('deflate-raw'))).arrayBuffer()) : raw;
    const local = new DataView(new ArrayBuffer(30));
    local.setUint32(0, 0x04034b50, true);
    local.setUint16(8, e.deflate ? 8 : 0, true);
    local.setUint32(18, data.length, true);
    local.setUint32(22, e.size ?? raw.length, true);
    local.setUint16(26, name.length, true);
    const cd = new DataView(new ArrayBuffer(46));
    cd.setUint32(0, 0x02014b50, true);
    cd.setUint16(10, e.deflate ? 8 : 0, true);
    cd.setUint32(20, data.length, true);
    cd.setUint32(24, e.size ?? raw.length, true);
    cd.setUint16(28, name.length, true);
    cd.setUint32(42, offset, true);
    parts.push(new Uint8Array(local.buffer), name, data);
    central.push(new Uint8Array(cd.buffer), name);
    offset += 30 + name.length + data.length;
  }
  const cdSize = central.reduce((n, p) => n + p.length, 0);
  const eocd = new DataView(new ArrayBuffer(22));
  eocd.setUint32(0, 0x06054b50, true);
  eocd.setUint16(8, entries.length, true);
  eocd.setUint16(10, entries.length, true);
  eocd.setUint32(12, cdSize, true);
  eocd.setUint32(16, offset, true);
  return new Blob([...parts, ...central, new Uint8Array(eocd.buffer)] as BlobPart[]);
}

describe('readZipText', () => {
  it('finds a stored entry in any folder', async () => {
    const file = await zip([{ name: 'export/readme.txt', text: 'hello' }, { name: 'export/decks.csv', text: 'id;name' }]);
    expect(await readZipText(file, 'decks.csv')).toBe('id;name');
  });

  it('inflates a deflated entry', async () => {
    const text = 'id;name;format\n'.repeat(200);
    expect(await readZipText(await zip([{ name: 'decks.csv', text, deflate: true }]), 'decks.csv')).toBe(text);
  });

  it('returns null without the entry, and throws on a file that is not a ZIP', async () => {
    expect(await readZipText(await zip([{ name: 'cards.csv', text: 'x' }]), 'decks.csv')).toBeNull();
    await expect(readZipText(new Blob(['not a zip']), 'decks.csv')).rejects.toBeInstanceOf(ZipError);
  });

  it('rejects an entry declared or inflated past 20 MB', async () => {
    await expect(readZipText(await zip([{ name: 'decks.csv', text: 'x', size: 21 * 1024 * 1024 }]), 'decks.csv')).rejects.toBeInstanceOf(ZipError);
    // A « zip bomb »: a small declared size, 21 MB once inflated.
    const bomb = await zip([{ name: 'decks.csv', text: 'a'.repeat(21 * 1024 * 1024), deflate: true, size: 10 }]);
    await expect(readZipText(bomb, 'decks.csv')).rejects.toBeInstanceOf(ZipError);
  });
});
