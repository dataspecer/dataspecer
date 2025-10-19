import { FilesystemNodeLocation, FilesystemAbstraction, getMetaPrefixType, AvailableFilesystems, GitIgnore } from "@dataspecer/git";
import { DSFilesystem } from "./implementations/ds-filesystem.ts";
import { ClassicFilesystem } from "./implementations/classic-filesystem.ts";

export class FilesystemFactory {
  public static async createFileSystem(roots: FilesystemNodeLocation[], filesystem: AvailableFilesystems, gitIgnore: GitIgnore | null): Promise<FilesystemAbstraction> {
    switch(filesystem) {
      case AvailableFilesystems.DS_Filesystem:
        return DSFilesystem.createFilesystemAbstraction(roots, gitIgnore);
      case AvailableFilesystems.ClassicFilesystem:
        return ClassicFilesystem.createFilesystemAbstraction(roots, gitIgnore);
      default:
        throw new Error("Not available filesystem, you forgot to extend the factory class");
    }
  }
}
