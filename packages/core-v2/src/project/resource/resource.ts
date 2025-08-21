import { LanguageString } from "@dataspecer/core/core/core-resource";

export interface BaseResource {
    /**
     * Unique identifier of the resource.
     * todo: This should be ID rather than IRI.
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
    representsBranchHead: boolean;
    branch: string;
    lastCommitHash: string;
}

export interface Package extends BaseResource {
    /**
     * List of sub-resources that are contained in this package.
     * If the value is undefined, the package was not-yet loaded.
     */
    subResources?: BaseResource[];
}

// TODO RadStr: Hardcoded the change of branch and projectIri - in future it won't be probably editable so remove it from here
export type ResourceEditable = Pick<BaseResource, "iri" | "userMetadata" | "projectIri" | "branch" >;