import { FilesystemNodeLocation, FilesystemAbstraction, AvailableFilesystems, GitIgnore } from "@dataspecer/git";
import { DSFilesystem } from "./implementations/ds-filesystem.ts";
import { ResourceModelForFilesystemRepresentation, ResourceModelForPull } from "../resource-model-api/export/export-api/export.ts";
import { ClassicFilesystem } from "./implementations/classic-filesystem.ts";

export class FilesystemFactory {
  public static async createFileSystem(
    filesystem: AvailableFilesystems,
    factoryMethodParameters: FilesystemFactoryMethodParams,
  ): Promise<FilesystemAbstraction> {
    switch(filesystem) {
      case AvailableFilesystems.DS_Filesystem:
        return DSFilesystem.createFilesystemAbstraction(factoryMethodParameters);
      case AvailableFilesystems.ClassicFilesystem:
        return ClassicFilesystem.createFilesystemAbstraction(factoryMethodParameters);
      default:
        throw new Error("Not available filesystem, you forgot to extend the factory class");
    }
  }
}


export type FilesystemFactoryMethodParams = {
  roots: FilesystemNodeLocation[];
  gitIgnore: GitIgnore | null;
} & DsFsConstructorParams;

type DataspecerFilesystemConstructorBaseType = {
  exportedBy: string | null;
  databaseMigrationVersion: number | null;
  deleteBlob: ((iri: string, datastoreType: string) => Promise<void>) | null;
  deleteResource: ((iri: string) => Promise<void>) | null;
}

export type DsFsConstructorParams = {
  resourceModel: ResourceModelForFilesystemRepresentation | null;
} & DataspecerFilesystemConstructorBaseType;

/**
 * @todo The naming really is not the best ...
 */
export type DsFsConstructorParamsWithStrongerResourceModel = {
  resourceModel: ResourceModelForPull | null;
} & DataspecerFilesystemConstructorBaseType;


/**
 * Creates new filesystem abstraction from given {@link roots}. The underlying filesystem of course depends on the implementation.
 * The actual implementations of this interface should be more restrictive, when it comes to the returned {@link FilesystemAbstraction} types -
 *  it should be the actual created type.
 * @param resourceModel the resource model to use. It is used only by the DS filesystem, the Git one ignores it (that is null can be provided).
 * @returns The created instance of type {@link FilesystemAbstraction}.
 */
export type FileSystemAbstractionFactoryMethod = (parameters: FilesystemFactoryMethodParams) => Promise<FilesystemAbstraction>;
