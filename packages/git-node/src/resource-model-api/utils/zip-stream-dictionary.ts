import JSZip from "jszip";
import {StreamDictionary} from "@dataspecer/core/io/stream/stream-dictionary";
import {InputStream} from "@dataspecer/core/io/stream/input-stream";
import {OutputStream} from "@dataspecer/core/io/stream/output-stream";

/**
 * @todo TODO RadStr PR: Move to some different package - something like core-node or something, it should not be in git-node package
 * Stream dictionary, that can create zip files instead of saving the content
 * directly to the file system. Some methods have missing implementation.
 */
export class ZipStreamDictionary implements StreamDictionary {
    private readonly zip: JSZip;

    public constructor() {
        this.zip = new JSZip();
    }

    exists(path: string): Promise<boolean> {
        throw new Error("Method not implemented.");
    }

    list(): Promise<string[]> {
        throw new Error("Method not implemented.");
    }

    readPath(path: string): InputStream {
        throw new Error("Method not implemented.");
    }

    writePath(path: string): OutputStream {
        const parts: (string)[] = [];
        return {
            // @ts-ignore
            write: (data: string) => {
                parts.push(data);
            },
            close: async (): Promise<void> => {
                this.zip.file(path, parts.join(""), {compression: "DEFLATE"});
            }
        };
    }

    public save(): Promise<Buffer> {
        return this.zip.generateAsync({type: "nodebuffer"});
    }
}
