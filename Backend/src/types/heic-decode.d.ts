declare module 'heic-decode' {
  interface DecodedImage {
    width: number;
    height: number;
    /** RGBA, 4 bytes per pixel. */
    data: Uint8ClampedArray;
  }
  interface LazyImage {
    width: number;
    height: number;
    decode(): Promise<DecodedImage>;
  }
  function decode(options: { buffer: Uint8Array }): Promise<DecodedImage>;
  namespace decode {
    function all(options: { buffer: Uint8Array }): Promise<LazyImage[] & { dispose(): void }>;
  }
  export = decode;
}
