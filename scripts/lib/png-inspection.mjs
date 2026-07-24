import { Buffer } from "node:buffer";
import { inflateSync } from "node:zlib";
import pngjs from "pngjs";

const { PNG } = pngjs;
const PNG_SIGNATURE = Buffer.from([
  0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a,
]);

export const PNG_LIMITS = Object.freeze({
  maxDimension: 2048,
  maxPixels: 4_194_304,
});

function contextualError(context, message, cause) {
  const error = new Error(`${context}: ${message}`);
  if (cause !== undefined) error.cause = cause;
  return error;
}

function inspectStructure(buffer, context, limits) {
  if (!Buffer.isBuffer(buffer)) {
    throw contextualError(context, "PNG input must be a Buffer");
  }
  if (
    buffer.length < PNG_SIGNATURE.length ||
    !buffer.subarray(0, PNG_SIGNATURE.length).equals(PNG_SIGNATURE)
  ) {
    throw contextualError(context, "invalid PNG signature");
  }

  let offset = PNG_SIGNATURE.length;
  let ihdr;
  let sawIdat = false;
  let sawIend = false;
  const idatParts = [];

  while (offset < buffer.length) {
    if (offset + 12 > buffer.length) {
      throw contextualError(context, `truncated PNG chunk at byte ${offset}`);
    }
    const length = buffer.readUInt32BE(offset);
    const type = buffer.subarray(offset + 4, offset + 8).toString("ascii");
    const end = offset + 12 + length;
    if (end > buffer.length) {
      throw contextualError(
        context,
        `truncated ${type || "unknown"} chunk at byte ${offset}`,
      );
    }

    if (offset === PNG_SIGNATURE.length && type !== "IHDR") {
      throw contextualError(context, "IHDR must be the first PNG chunk");
    }
    if (type === "IHDR") {
      if (ihdr !== undefined || length !== 13) {
        throw contextualError(context, "missing or invalid IHDR chunk");
      }
      const dataOffset = offset + 8;
      const width = buffer.readUInt32BE(dataOffset);
      const height = buffer.readUInt32BE(dataOffset + 4);
      const bitDepth = buffer[dataOffset + 8];
      const colorType = buffer[dataOffset + 9];
      if (width === 0 || height === 0) {
        throw contextualError(
          context,
          "PNG dimensions must be greater than zero",
        );
      }
      if (
        width > limits.maxDimension ||
        height > limits.maxDimension ||
        width * height > limits.maxPixels
      ) {
        throw contextualError(
          context,
          `PNG dimensions ${width}x${height} exceed defensive limit ${limits.maxDimension}x${limits.maxDimension} and ${limits.maxPixels} pixels`,
        );
      }
      ihdr = { width, height, bitDepth, colorType };
    } else if (type === "acTL") {
      throw contextualError(
        context,
        "APNG animation chunk acTL is not allowed",
      );
    } else if (type === "IDAT") {
      sawIdat = true;
      idatParts.push(buffer.subarray(offset + 8, offset + 8 + length));
    } else if (type === "IEND") {
      if (length !== 0) {
        throw contextualError(context, "IEND chunk must be empty");
      }
      sawIend = true;
      if (end !== buffer.length) {
        throw contextualError(context, "unexpected bytes after IEND");
      }
    }

    offset = end;
    if (sawIend) break;
  }

  if (ihdr === undefined) {
    throw contextualError(context, "missing or invalid IHDR chunk");
  }
  if (!sawIdat) {
    throw contextualError(context, "missing IDAT image data");
  }
  if (!sawIend) {
    throw contextualError(context, "missing IEND chunk");
  }
  return {
    ...ihdr,
    idatData: Buffer.concat(idatParts),
  };
}

export function inspectPng(buffer, context = "PNG", limits = PNG_LIMITS) {
  const header = inspectStructure(buffer, context, limits);
  let decoded;
  try {
    inflateSync(header.idatData, {
      maxOutputLength: limits.maxPixels * 8 + limits.maxDimension,
    });
    decoded = PNG.sync.read(buffer, {
      checkCRC: true,
      skipRescale: false,
    });
  } catch (error) {
    throw contextualError(
      context,
      `PNG decode or CRC validation failed: ${error.message}`,
      error,
    );
  }

  if (decoded.width !== header.width || decoded.height !== header.height) {
    throw contextualError(
      context,
      `decoded dimensions ${decoded.width}x${decoded.height} differ from IHDR ${header.width}x${header.height}`,
    );
  }
  const expectedBytes = header.width * header.height * 4;
  if (decoded.data.length !== expectedBytes) {
    throw contextualError(
      context,
      `decoded RGBA length ${decoded.data.length} differs from expected ${expectedBytes}`,
    );
  }

  let hasTransparency = false;
  for (let index = 3; index < decoded.data.length; index += 4) {
    if (decoded.data[index] < 255) {
      hasTransparency = true;
      break;
    }
  }

  return {
    width: header.width,
    height: header.height,
    animated: false,
    frameCount: 1,
    hasTransparency,
    colorType: header.colorType,
    bitDepth: header.bitDepth,
  };
}
