import * as fs from 'node:fs'
import { binread, binwrite, BinaryReader, BinaryWriter } from './src/index'

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace jest {
    interface Matchers<R> {
      toBeEqualArrayBuffer (expected: ArrayBufferLike | ArrayBufferView): R
      binReadWriteEquality (ObjectDefinition: any): R
      fileReadWriteEquality (ObjectDefinition: any): R
    }
  }
}

function equalArrayBuffer (buf1: ArrayBufferLike | ArrayBufferView, buf2: ArrayBufferLike | ArrayBufferView) {
  const arr1 = ArrayBuffer.isView(buf1)
    ? new Uint8Array(buf1.buffer.slice(buf1.byteOffset, buf1.byteOffset + buf1.byteLength))
    : new Uint8Array(buf1)
  const arr2 = ArrayBuffer.isView(buf2)
    ? new Uint8Array(buf2.buffer.slice(buf2.byteOffset, buf2.byteOffset + buf2.byteLength))
    : new Uint8Array(buf2)

  if (arr1.byteLength !== arr2.byteLength) {
    return {
      message: () => `Buffer length not matching ${arr1.byteLength} !== ${arr2.byteLength} | ${arr1} !== ${arr2}`,
      pass: false
    }
  }

  for (let i = 0; i != arr1.byteLength; i++) {
    if (arr1[i] !== arr2[i]) return {
      message: () => `Buffer not matching '${arr1[i]} !== ${arr2[i]}' at position ${i}`,
      pass: false
    }
  }

  return {
    message: () => `Matching buffers`,
    pass: true
  }
}

expect.extend({
  toBeEqualArrayBuffer (arr1: ArrayBufferLike | ArrayBufferView, arr2: ArrayBufferLike | ArrayBufferView) {
    return equalArrayBuffer(arr1, arr2)
  },
  binReadWriteEquality (arr: ArrayBufferLike | ArrayBufferView, ObjectDefinition: any) {
    const decoded = binread(new BinaryReader(arr), ObjectDefinition)

    const writtenBuf = new BinaryWriter()
    binwrite(writtenBuf, ObjectDefinition, decoded)

    return equalArrayBuffer(arr, writtenBuf.buffer)
  },
  fileReadWriteEquality (filename: string, ObjectDefinition: any) {
    const data = fs.readFileSync(filename)

    const decoded = binread(new BinaryReader(data), ObjectDefinition)

    const writtenBuf = new BinaryWriter()
    binwrite(writtenBuf, ObjectDefinition, decoded)

    return equalArrayBuffer(data, writtenBuf.buffer)
  },
})

export {}
