import { LanguageString } from "@dataspecer/core-v2/semantic-model/concepts";

/**
 * Base information every resource has or should have.
 */
export interface BaseResource {
    /**
     * Unique identifier of the resource.
     */
    iri: string;

    /**
     * All available types of the resource.
     * This means how the given resource can be interpreted.
     */
    types: string[];

    /**
     * User-friendly metadata that each resource may have.
     */
    userMetadata: {
        label?: LanguageString;
        description?: LanguageString;
        tags?: string[];
    };

    metadata: {
        modificationDate?: Date;
        creationDate?: Date;
    };

    linkedGitRepositoryURL: string;
    projectIri: string;
    branch: string;
    representsBranchHead: boolean;
    lastCommitHash: string;
    activeMergeStateCount: number;
    hasUncommittedChanges: boolean;

    dataStores: Record<string, string>;
}

export interface Package extends BaseResource {
    /**
     * List of sub-resources that are contained in this package.
     * If the value is undefined, the package was not-yet loaded.
     */
    subResources?: BaseResource[];
}

export interface LoadedPackage extends BaseResource {
    subResources: BaseResource[];
}
