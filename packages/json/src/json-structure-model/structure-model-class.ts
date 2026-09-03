import { StructureModelClass } from "@dataspecer/generators/structure-model/model";

export class JsonStructureModelClass extends StructureModelClass {
    /**
     * Key of property representing ID of the entity.
     * If set to null, the property won't be used.
     * If set to undefined, the default value will be used.
     */
    jsonIdKeyAlias: string | null | undefined = undefined;

    /**
     * Whether the property @id is required.
     * If set to undefined, the default value will be used.
     */
    jsonIdRequired: boolean | undefined = undefined;

    /**
     * Key of property representing the type of the entity.
     * If set to null, the property won't be used.
     * If set to undefined, the default value will be used.
     */
    jsonTypeKeyAlias: string | null | undefined = undefined;

    /**
     * Whether the property @type is required.
     * If set to undefined, the default value will be used.
     */
    jsonTypeRequired: boolean | undefined = undefined;

    /**
     * Whether you are allowed to use prefixes in the IRI and therefore it needs
     * to fallback to string instead of iri.
     */
    iriUsesPrefixes: boolean | undefined = undefined;
}