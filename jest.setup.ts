import { binread, binwrite, BinaryReader, BinaryWriter } from './src'

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace jest {
    interface Matchers<R> {
      toBeEqualArrayBuffer (expected: ArrayBuffer): R
      binReadWriteEquality (ObjectDefinition: any): R
    }
  }
}

function equalArrayBuffer (buf1: ArrayBuffer, buf2: ArrayBuffer) {
  const arr1 = new Uint8Array(buf1)
  const arr2 = new Uint8Array(buf2)

  if (arr1.byteLength !== arr2.byteLength) {
    return {
      message: () => `Buffer length not matching ${arr1.byteLength} !== ${arr2.byteLength} | ${arr1} !== ${arr2}`,
      pass: false
    }
  }

  for (let i = 0; i != buf1.byteLength; i++) {
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
  toBeEqualArrayBuffer (buf1: ArrayBuffer, buf2: ArrayBuffer) {
    return equalArrayBuffer(buf1, buf2)
  },
  binReadWriteEquality (buf: ArrayBuffer, ObjectDefinition: any) {
    const decoded = binread(new BinaryReader(buf), ObjectDefinition)

    const writtenBuf = new BinaryWriter()
    binwrite(writtenBuf, ObjectDefinition, decoded)

    return equalArrayBuffer(buf, writtenBuf.buffer())
  },
})

export {}
