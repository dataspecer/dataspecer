import { GitProvider, FilesystemNodeLocation, FilesystemAbstraction, getMetaPrefixType, AvailableFilesystems } from "@dataspecer/git";
import { DSFilesystem } from "./implementations/ds-filesystem.ts";
import { ClassicFilesystem } from "./implementations/classic-filesystem.ts";

export class FilesystemFactory {
  public static async createFileSystem(roots: FilesystemNodeLocation[], filesystem: AvailableFilesystems, gitProvider: GitProvider | null): Promise<FilesystemAbstraction> {
    switch(filesystem) {
      case AvailableFilesystems.DS_Filesystem:
        return DSFilesystem.createFilesystemAbstraction(roots, gitProvider);
      case AvailableFilesystems.ClassicFilesystem:
        return ClassicFilesystem.createFilesystemAbstraction(roots, gitProvider);
      default:
        throw new Error("Not available filesystem, you forgot to extend the factory class");
    }
  }
}
