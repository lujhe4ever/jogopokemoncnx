import { Buffer } from "node:buffer";

const CAPTURE_PATTERN = Buffer.from("OggS", "ascii");
const VORBIS_IDENTIFICATION = Buffer.from([
  0x01, 0x76, 0x6f, 0x72, 0x62, 0x69, 0x73,
]);

function contextualError(context, message) {
  return new Error(`${context}: ${message}`);
}

export function inspectOggVorbis(buffer, context = "OGG") {
  if (!Buffer.isBuffer(buffer) || buffer.length < 27) {
    throw contextualError(context, "truncated Ogg input");
  }

  let offset = 0;
  let serialNumber = null;
  let previousSequence = -1;
  let finalGranule = 0n;
  let firstPacket = Buffer.alloc(0);
  let firstPacketComplete = false;
  let pageCount = 0;

  while (offset < buffer.length) {
    if (offset + 27 > buffer.length) {
      throw contextualError(context, `truncated page header at byte ${offset}`);
    }
    if (!buffer.subarray(offset, offset + 4).equals(CAPTURE_PATTERN)) {
      throw contextualError(
        context,
        `invalid capture pattern at byte ${offset}`,
      );
    }
    if (buffer[offset + 4] !== 0) {
      throw contextualError(context, "unsupported Ogg bitstream version");
    }

    const granule = buffer.readBigUInt64LE(offset + 6);
    const pageSerial = buffer.readUInt32LE(offset + 14);
    const sequence = buffer.readUInt32LE(offset + 18);
    const segmentCount = buffer[offset + 26];
    const segmentTableEnd = offset + 27 + segmentCount;
    if (segmentTableEnd > buffer.length) {
      throw contextualError(
        context,
        `truncated segment table at byte ${offset}`,
      );
    }

    if (serialNumber === null) serialNumber = pageSerial;
    if (pageSerial !== serialNumber) {
      throw contextualError(context, "chained Ogg streams are not supported");
    }
    if (sequence !== previousSequence + 1) {
      throw contextualError(context, `unexpected page sequence ${sequence}`);
    }
    previousSequence = sequence;

    let bodyLength = 0;
    for (let index = offset + 27; index < segmentTableEnd; index += 1) {
      bodyLength += buffer[index];
    }
    const pageEnd = segmentTableEnd + bodyLength;
    if (pageEnd > buffer.length) {
      throw contextualError(context, `truncated page body at byte ${offset}`);
    }

    if (!firstPacketComplete) {
      let bodyOffset = segmentTableEnd;
      for (let index = offset + 27; index < segmentTableEnd; index += 1) {
        const segmentLength = buffer[index];
        firstPacket = Buffer.concat([
          firstPacket,
          buffer.subarray(bodyOffset, bodyOffset + segmentLength),
        ]);
        bodyOffset += segmentLength;
        if (segmentLength < 255) {
          firstPacketComplete = true;
          break;
        }
      }
    }

    if (granule !== 0xffffffffffffffffn && granule > finalGranule) {
      finalGranule = granule;
    }
    offset = pageEnd;
    pageCount += 1;
  }

  if (!firstPacketComplete || firstPacket.length < 30) {
    throw contextualError(context, "missing Vorbis identification packet");
  }
  if (!firstPacket.subarray(0, 7).equals(VORBIS_IDENTIFICATION)) {
    throw contextualError(context, "Ogg stream is not Vorbis");
  }
  const channels = firstPacket[11];
  const sampleRate = firstPacket.readUInt32LE(12);
  if (channels < 1 || sampleRate < 1 || finalGranule < 1n) {
    throw contextualError(context, "invalid Vorbis stream metadata");
  }

  return {
    format: "ogg",
    mimeType: "audio/ogg",
    channels,
    sampleRate,
    durationMs: Math.max(
      1,
      Math.round((Number(finalGranule) / sampleRate) * 1_000),
    ),
    pageCount,
  };
}
