import { GitProvider, FilesystemNodeLocation, FilesystemAbstraction } from "@dataspecer/git";
import { DSFilesystem } from "./implementations/ds-filesystem.ts";
import { ClassicFilesystem } from "./implementations/classic-filesystem.ts";

// TODO RadStr: Again move into common pakcage, it is also used as type on frontend
export enum AvailableFilesystems {
  DS_Filesystem = "ds-filesystem",
  ClassicFilesystem = "classic-filesystem",
}

export class FilesystemFactory {
  public static async createFileSystem(roots: FilesystemNodeLocation[], filesystem: AvailableFilesystems, gitProvider: GitProvider | null): Promise<FilesystemAbstraction> {
    switch(filesystem) {
      case AvailableFilesystems.DS_Filesystem:
        return DSFilesystem.createFilesystemAbstraction(roots, gitProvider);     // TODO RadStr: Await or not?
      case AvailableFilesystems.ClassicFilesystem:
        return ClassicFilesystem.createFilesystemAbstraction(roots, gitProvider);
      default:
        throw new Error("Not available filesystem, you forgot to extend the factory class");
    }
  }
}