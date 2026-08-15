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
     *
     * @deprecated Use project model
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
}

export interface Package extends BaseResource {
    /**
     * List of sub-resources that are contained in this package.
     * If the value is undefined, the package was not-yet loaded.
     */
    subResources?: BaseResource[];

    /**
     * Whether the package has pending evolution updates recorded on an
     * evolution branch, awaiting review and merge.
     *
     * If undefined, the information is not available.
     *
     * @deprecated Use project model's `ProjectModelEntityMeta.hasPendingEvolution` instead.
     */
    hasPendingEvolution?: boolean;
}

export type ResourceEditable = Pick<BaseResource, "iri" | "userMetadata">;