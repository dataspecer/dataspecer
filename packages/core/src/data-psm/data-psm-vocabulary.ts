const PSM = "https://ofn.gov.cz/slovník/psm/";

/**
 * Base IRI for PSM extensions vocabulary. Used to identify the extension data
 * carried by the entities, not the operations of the extension.
 */
export const PSM_EXTENSIONS = PSM + "extensions/" as `${typeof PSM}extensions/`; // as const

/**
 * Base IRI of the operation types of the structure model.
 */
const OPERATION = "https://schemas.dataspecer.com/structure-model/operations/";

/**
 * Base IRI of the operation types of the structure model extensions. The
 * extension name followed by "/operations/" completes the base of a single
 * extension.
 */
export const EXTENSION_OPERATION = "https://schemas.dataspecer.com/structure-model/extensions/";

export const HAS_TECHNICAL_LABEL = PSM + "technicalLabel";

export const HAS_ROOT = PSM + "hasRoot";

export const HAS_INTERPRETATION = PSM + "hasInterpretation";

export const HAS_EXTENDS = PSM + "extends";

export const HAS_PARTICIPANT = PSM + "hasParticipant";

export const HAS_DATA_TYPE = PSM + "hasDatatype";

export const ASSOCIATION_END = PSM + "AssociationEnd";

export const ATTRIBUTE = PSM + "Attribute";

export const CLASS = PSM + "Class";

export const CONTAINER = PSM + "Container";

export const SCHEMA = PSM + "Schema";

export const EXTERNAL_ROOT = PSM + "ExternalRoot";

export const INCLUDE = PSM + "Include";

export const OR = PSM + "Or";

export const CLASS_REFERENCE = PSM + "ClassReference";

export const HAS_REFERS_TO = PSM + "refersTo";

const DCTERMS = "http://purl.org/dc/terms/";

export const HAS_PART = DCTERMS + "hasPart";

export const HAS_HUMAN_LABEL = DCTERMS + "title";

export const HAS_HUMAN_DESCRIPTION = DCTERMS + "description";

export const CREATE_ASSOCIATION_END = OPERATION + "create-association-end";

export const CREATE_ASSOCIATION_END_RESULT = PSM + "CreateAssociationEndResult";

export const CREATE_ATTRIBUTE = OPERATION + "create-attribute";

export const CREATE_ATTRIBUTE_RESULT = PSM + "CreateAttributeResult";

export const CREATE_CLASS = OPERATION + "create-class";

export const CREATE_CLASS_RESULT = PSM + "CreateClassResult";

export const CREATE_CONTAINER = OPERATION + "create-container";

export const CREATE_CONTAINER_RESULT = PSM + "CreateContainerResult";

export const CREATE_EXTERNAL_ROOT = OPERATION + "create-external-root";

export const CREATE_EXTERNAL_ROOT_RESULT = PSM + "CreateExternalRootResult";

export const CREATE_CLASS_REFERENCE = OPERATION + "create-class-reference";

export const CREATE_INCLUDE = OPERATION + "create-include";

export const CREATE_INCLUDE_RESULT = PSM + "CreateIncludeResult";

export const CREATE_OR = OPERATION + "create-or";

export const CREATE_OR_RESULT = PSM + "CreateOrResult";

export const CREATE_CLASS_REFERENCE_RESULT = PSM + "CreateClassReferenceResult";

export const CREATE_SCHEMA = OPERATION + "create-schema";

export const CREATE_SCHEMA_RESULT = PSM + "CreateSchemaResult";

export const DELETE_ASSOCIATION_END = OPERATION + "delete-association-end";

export const DELETE_ATTRIBUTE = OPERATION + "delete-attribute";

export const DELETE_CLASS = OPERATION + "delete-class";

export const DELETE_CONTAINER = OPERATION + "delete-container";

export const DELETE_EXTERNAL_ROOT = OPERATION + "delete-external-root";

export const DELETE_CLASS_REFERENCE = OPERATION + "delete-class-reference";

export const DELETE_INCLUDE = OPERATION + "delete-include";

export const DELETE_OR = OPERATION + "delete-or";

export const MOVE_PROPERTY = OPERATION + "move-property";

export const REPLACE_ALONG_INHERITANCE = OPERATION + "replace-along-inheritance";

export const SET_CARDINALITY = OPERATION + "set-cardinality";

export const SET_CHOICE = OPERATION + "set-choice";

export const SET_DATATYPE = OPERATION + "set-datatype";

export const SET_EXTERNAL_ROOT_TYPES = OPERATION + "set-external-root-types";

export const SET_HUMAN_DESCRIPTION = OPERATION + "set-human-description";

export const SET_HUMAN_LABEL = OPERATION + "set-human-label";

export const SET_PROFILING = OPERATION + "set-profiling";

export const SET_ID_TYPE = OPERATION + "set-id-type";

export const SET_INSTANCES_HAVE_IDENTITY = OPERATION + "set-instances-have-identity";

export const SET_INSTANCES_SPECIFY_TYPES = OPERATION + "set-instances-specify-types";

export const SET_INTERPRETATION = OPERATION + "set-interpretation";

export const SET_IS_CLOSED = OPERATION + "set-is-closed";

export const SET_EMPTY_AS_COMPLEX = OPERATION + "set-empty-as-complex";

export const SET_ORDER = OPERATION + "set-order";

export const SET_PART = OPERATION + "set-part";

export const SET_ROOT_COLLECTION = OPERATION + "set-root-collection";

export const SET_DEMATERIALIZED = OPERATION + "set-dematerialized";

export const SET_ROOTS = OPERATION + "set-roots";

export const SET_TECHNICAL_LABEL = OPERATION + "set-technical-label";

export const SET_JSON_ENFORCE_CONTEXT = OPERATION + "set-json-enforce-context";

export const SET_JSON_LD_DEFINED_PREFIXES = OPERATION + "set-json-ld-defined-prefixes";

export const SET_JSON_LD_TYPE_MAPPING = OPERATION + "set-json-ld-type-mapping";

export const SET_JSON_SCHEMA_PREFIXES_IN_IRI_REGEX = OPERATION + "set-json-schema-prefixes-in-iri-regex";

export const UNSET_CHOICE = OPERATION + "unset-choice";

export const UNWRAP_OR = OPERATION + "unwrap-or";

export const UNWRAP_OR_RESULT = PSM + "UnwrapOrResult";

export const WRAP_WITH_OR = OPERATION + "wrap-with-or";

export const WRAP_WITH_OR_RESULT = PSM + "WrapWithOrResult";
