interface Hashes {
  pHash: string;
  dHash: string;
}

type ExclusionZone = {
    x: number
    y: number
    width: number
    height: number
}

type Props = {
    img: Uint8Array<ArrayBuffer>
    exclusionZone: ExclusionZone
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
        GetHashOfImageWithExclusionZone: (props: Props) => Hashes
    }
}
