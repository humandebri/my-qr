import { Principal } from "@dfinity/principal";
import { sha224 } from "js-sha256";

// ICP Account Identifier生成
export function principalToAccountIdentifier(principal: Principal): string {
  const domain_separator = "\x0Aaccount-id";
  const payload = new Uint8Array([
    ...new TextEncoder().encode(domain_separator),
    ...principal.toUint8Array(),
    ...new Array(32).fill(0), // subaccount (all zeros)
  ]);
  
  const hash = sha224(payload);
  
  // CRC32チェックサム計算
  const crc32 = calculateCRC32(new Uint8Array(Buffer.from(hash, 'hex')));
  
  // チェックサムと実際のハッシュを結合
  const accountId = new Uint8Array(4 + 28);
  const view = new DataView(accountId.buffer);
  view.setUint32(0, crc32, false); // big-endian
  accountId.set(new Uint8Array(Buffer.from(hash, 'hex')), 4);
  
  return Array.from(accountId)
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}

// CRC32計算関数
function calculateCRC32(data: Uint8Array): number {
  const table = new Uint32Array(256);
  
  // CRC32テーブル生成
  for (let i = 0; i < 256; i++) {
    let c = i;
    for (let j = 0; j < 8; j++) {
      c = (c & 1) ? (0xedb88320 ^ (c >>> 1)) : (c >>> 1);
    }
    table[i] = c;
  }
  
  let crc = 0xffffffff;
  for (let i = 0; i < data.length; i++) {
    crc = table[(crc ^ data[i]) & 0xff] ^ (crc >>> 8);
  }
  
  return (crc ^ 0xffffffff) >>> 0;
} 