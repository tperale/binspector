import * as fs from 'node:fs'
import { binread, binwrite, BinaryReader, BinaryWriter } from './src'

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace jest {
    interface Matchers<R> {
      toBeEqualArrayBuffer (expected: Uint8Array): R
      binReadWriteEquality (ObjectDefinition: any): R
      fileReadWriteEquality (ObjectDefinition: any): R
    }
  }
}

function equalArrayBuffer (arr1: Uint8Array, arr2: Uint8Array) {
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
  toBeEqualArrayBuffer (arr1: Uint8Array, arr2: Uint8Array) {
    return equalArrayBuffer(arr1, arr2)
  },
  binReadWriteEquality (arr: ArrayBuffer, ObjectDefinition: any) {
    const decoded = binread(new BinaryReader(arr), ObjectDefinition)

    const writtenBuf = new BinaryWriter()
    binwrite(writtenBuf, ObjectDefinition, decoded)

    return equalArrayBuffer(new Uint8Array(arr), new Uint8Array(writtenBuf.buffer()))
  },
  fileReadWriteEquality (filename: string, ObjectDefinition: any) {
    const data = fs.readFileSync(filename)

    const decoded = binread(new BinaryReader(data), ObjectDefinition)

    const writtenBuf = new BinaryWriter()
    binwrite(writtenBuf, ObjectDefinition, decoded)

    return equalArrayBuffer(data, new Uint8Array(writtenBuf.buffer()))
  },
})

export {}
