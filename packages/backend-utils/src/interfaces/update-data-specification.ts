import {DataSpecification} from "@dataspecer/core/data-specification/model";
import {DataSpecificationWithMetadata} from "./data-specification-with-metadata.ts";

/**
 * Data type of update that is sent to the backend in order to update a data specification.
 */
export type UpdateDataSpecification =  Partial<Pick<
    DataSpecification & DataSpecificationWithMetadata,
    "importsDataSpecifications" | "tags" | "artefactConfiguration" | "type" | "cimAdapters"
    >>;
