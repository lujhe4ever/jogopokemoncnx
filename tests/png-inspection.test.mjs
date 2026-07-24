import { Buffer } from "node:buffer";
import pngjs from "pngjs";
import { describe, expect, it } from "vitest";
import { PNG_LIMITS, inspectPng } from "../scripts/lib/png-inspection.mjs";

const { PNG } = pngjs;

function makePng({ alpha = 255, width = 2, height = 2 } = {}) {
  const image = new PNG({ width, height });
  for (let index = 0; index < image.data.length; index += 4) {
    image.data[index] = 20;
    image.data[index + 1] = 80;
    image.data[index + 2] = 140;
    image.data[index + 3] = alpha;
  }
  return PNG.sync.write(image);
}

function crc32(buffer) {
  let crc = 0xffffffff;
  for (const byte of buffer) {
    crc ^= byte;
    for (let bit = 0; bit < 8; bit += 1) {
      crc = (crc >>> 1) ^ (crc & 1 ? 0xedb88320 : 0);
    }
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function chunks(buffer) {
  const found = [];
  let offset = 8;
  while (offset + 12 <= buffer.length) {
    const length = buffer.readUInt32BE(offset);
    const type = buffer.subarray(offset + 4, offset + 8).toString("ascii");
    found.push({ offset, length, type });
    offset += 12 + length;
  }
  return found;
}

function corruptIdatWithValidCrc(buffer) {
  const result = Buffer.from(buffer);
  const idat = chunks(result).find((chunk) => chunk.type === "IDAT");
  const dataOffset = idat.offset + 8;
  result[dataOffset + idat.length - 1] ^= 0xff;
  const crcInput = result.subarray(idat.offset + 4, dataOffset + idat.length);
  result.writeUInt32BE(crc32(crcInput), dataOffset + idat.length);
  return result;
}

function insertActl(buffer) {
  const firstIdat = chunks(buffer).find((chunk) => chunk.type === "IDAT");
  const type = Buffer.from("acTL");
  const data = Buffer.alloc(8);
  data.writeUInt32BE(1, 0);
  data.writeUInt32BE(0, 4);
  const chunk = Buffer.alloc(20);
  chunk.writeUInt32BE(data.length, 0);
  type.copy(chunk, 4);
  data.copy(chunk, 8);
  chunk.writeUInt32BE(crc32(Buffer.concat([type, data])), 16);
  return Buffer.concat([
    buffer.subarray(0, firstIdat.offset),
    chunk,
    buffer.subarray(firstIdat.offset),
  ]);
}

describe("PNG inspection", () => {
  it("decodes opaque and transparent pixels accurately", () => {
    expect(inspectPng(makePng(), "opaque")).toMatchObject({
      width: 2,
      height: 2,
      animated: false,
      frameCount: 1,
      hasTransparency: false,
    });
    expect(inspectPng(makePng({ alpha: 90 }), "transparent")).toMatchObject({
      width: 2,
      height: 2,
      hasTransparency: true,
    });
  });

  it("rejects invalid signatures and truncated files", () => {
    const valid = makePng();
    expect(() => inspectPng(Buffer.from("not-png"), "signature")).toThrow(
      /signature: invalid PNG signature/,
    );
    expect(() =>
      inspectPng(valid.subarray(0, valid.length - 5), "truncated"),
    ).toThrow(/truncated|IEND/);
  });

  it("rejects CRC corruption", () => {
    const corrupted = Buffer.from(makePng());
    corrupted[29] ^= 0xff;
    expect(() => inspectPng(corrupted, "crc")).toThrow(
      /decode or CRC validation failed/,
    );
  });

  it("rejects corrupt compressed image data even with a valid chunk CRC", () => {
    expect(() =>
      inspectPng(corruptIdatWithValidCrc(makePng()), "compressed"),
    ).toThrow(/decode or CRC validation failed/);
  });

  it("rejects zero or excessive dimensions before decoding", () => {
    const zero = Buffer.from(makePng());
    zero.writeUInt32BE(0, 16);
    expect(() => inspectPng(zero, "zero")).toThrow(
      /dimensions must be greater than zero/,
    );

    const excessive = Buffer.from(makePng());
    excessive.writeUInt32BE(PNG_LIMITS.maxDimension + 1, 16);
    expect(() => inspectPng(excessive, "excessive")).toThrow(
      /exceed defensive limit/,
    );
  });

  it("rejects APNG animation chunks", () => {
    expect(() => inspectPng(insertActl(makePng()), "apng")).toThrow(
      /APNG animation chunk acTL is not allowed/,
    );
  });
});
