import { FilesystemNodeLocation, FilesystemAbstraction, AvailableFilesystems, GitIgnore } from "@dataspecer/git";
import { DSFilesystem } from "./implementations/ds-filesystem.ts";
import { ClassicFilesystem } from "./implementations/classic-filesystem.ts";
import { ResourceModelForFilesystemRepresentation } from "../export.ts";

export class FilesystemFactory {
  public static async createFileSystem(
    roots: FilesystemNodeLocation[],
    filesystem: AvailableFilesystems,
    gitIgnore: GitIgnore | null,
    resourceModel: ResourceModelForFilesystemRepresentation | null
  ): Promise<FilesystemAbstraction> {
    switch(filesystem) {
      case AvailableFilesystems.DS_Filesystem:
        return DSFilesystem.createFilesystemAbstraction(roots, gitIgnore, resourceModel);
      case AvailableFilesystems.ClassicFilesystem:
        return ClassicFilesystem.createFilesystemAbstraction(roots, gitIgnore, resourceModel);
      default:
        throw new Error("Not available filesystem, you forgot to extend the factory class");
    }
  }
}


/**
 * Creates new filesystem abstraction from given {@link roots}. The underlying filesystem of course depends on the implementation.
 * The actual implementations of this interface should be more restrictive, when it comes to the returned {@link FilesystemAbstraction} types -
 *  it should be the actual created type.
 * @param resourceModel the resource model to use. It is used only by the DS filesystem, the Git one ignores it (that is null can be provided).
 * @returns The created instance of type {@link FilesystemAbstraction}.
 */
export type FileSystemAbstractionFactoryMethod = (roots: FilesystemNodeLocation[], gitIgnore: GitIgnore | null, resourceModel: ResourceModelForFilesystemRepresentation | null) => Promise<FilesystemAbstraction>;
