export interface Hashes {
  phash: string;
  dhash: string;
}

export {}
declare global {
    export interface Window {
        Go: {
            new(): {
                run: (inst: WebAssembly.Instance) => Promise<void>
                importObject: WebAssembly.Imports
            }
        }
        GetHashOfImage: (imageBuffer: Uint8Array<ArrayBuffer>, imageType: string) => Hashes
    }
}
