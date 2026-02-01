const PSM = "https://ofn.gov.cz/slovník/psm/";

/**
 * Base IRI for PSM extensions vocabulary.
 */
export const PSM_EXTENSIONS = PSM + "extensions/" as `${typeof PSM}extensions/`; // as const

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

export const CREATE_ASSOCIATION_END = PSM + "CreateAssociationEnd";

export const CREATE_ASSOCIATION_END_RESULT = PSM + "CreateAssociationEndResult";

export const CREATE_ATTRIBUTE = PSM + "CreateAttribute";

export const CREATE_ATTRIBUTE_RESULT = PSM + "CreateAttributeResult";

export const CREATE_CLASS = PSM + "CreateClass";

export const CREATE_CLASS_RESULT = PSM + "CreateClassResult";

export const CREATE_CONTAINER = PSM + "CreateContainer";

export const CREATE_CONTAINER_RESULT = PSM + "CreateContainerResult";

export const CREATE_EXTERNAL_ROOT = PSM + "CreateExternalRoot";

export const CREATE_EXTERNAL_ROOT_RESULT = PSM + "CreateExternalRootResult";

export const CREATE_CLASS_REFERENCE = PSM + "CreateClassReference";

export const CREATE_INCLUDE = PSM + "CreateInclude";

export const CREATE_INCLUDE_RESULT = PSM + "CreateIncludeResult";

export const CREATE_OR = PSM + "CreateOr";

export const CREATE_OR_RESULT = PSM + "CreateOrResult";

export const CREATE_CLASS_REFERENCE_RESULT = PSM + "CreateClassReferenceResult";

export const CREATE_SCHEMA = PSM + "CreateSchema";

export const CREATE_SCHEMA_RESULT = PSM + "CreateSchemaResult";

export const DELETE_ASSOCIATION_END = PSM + "DeleteAssociationEnd";

export const DELETE_ATTRIBUTE = PSM + "DeleteAttribute";

export const DELETE_CLASS = PSM + "DeleteClass";

export const DELETE_CONTAINER = PSM + "DeleteContainer";

export const DELETE_EXTERNAL_ROOT = PSM + "DeleteExternalRoot";

export const DELETE_CLASS_REFERENCE = PSM + "DeleteClassReference";

export const DELETE_INCLUDE = PSM + "DeleteInclude";

export const DELETE_OR = PSM + "DeleteOr";

export const MOVE_PROPERTY = PSM + "MoveProperty";

export const REPLACE_ALONG_INHERITANCE = PSM + "ReplaceAlongInheritance";

export const SET_CARDINALITY = PSM + "SetCardinality";

export const SET_CHOICE = PSM + "SetChoice";

export const SET_DATATYPE = PSM + "SetDataType";

export const SET_EXTERNAL_ROOT_TYPES = PSM + "SetExternalRootTypes";

export const SET_HUMAN_DESCRIPTION = PSM + "SetHumanDescription";

export const SET_HUMAN_LABEL = PSM + "SetHumanLabel";

export const SET_PROFILING = PSM + "SetProfiling";

export const SET_ID_TYPE = PSM + "SetIdType";

export const SET_INSTANCES_HAVE_IDENTITY = PSM + "SetInstancesHaveIdentity";

export const SET_INSTANCES_SPECIFY_TYPES = PSM + "SetInstancesSpecifyTypes";

export const SET_INTERPRETATION = PSM + "SetInterpretation";

export const SET_IS_CLOSED = PSM + "SetIsClosed";

export const SET_EMPTY_AS_COMPLEX = PSM + "SetEmptyAsComplex";

export const SET_ORDER = PSM + "SetOrder";

export const SET_PART = PSM + "SetPart";

export const SET_ROOT_COLLECTION = PSM + "SetRootCollection";

export const SET_MATERIALIZED = PSM + "SetMaterialized";

export const SET_ROOTS = PSM + "SetRoots";

export const SET_TECHNICAL_LABEL = PSM + "SetTechnicalLabel";

export const SET_JSON_ENFORCE_CONTEXT = PSM + "SetJsonEnforceContext";

export const SET_JSON_LD_DEFINED_PREFIXES = PSM + "SetJsonLdDefinedPrefixes";

export const SET_JSON_LD_TYPE_MAPPING = PSM + "SetJsonLdDefinedTypeMapping";

export const SET_JSON_SCHEMA_PREFIXES_IN_IRI_REGEX = PSM + "SetJsonSchemaPrefixesInIriRegex";

export const UNSET_CHOICE = PSM + "UnsetChoice";

export const UNWRAP_OR = PSM + "UnwrapOr";

export const UNWRAP_OR_RESULT = PSM + "UnwrapOrResult";

export const WRAP_WITH_OR = PSM + "WrapWithOr";

export const WRAP_WITH_OR_RESULT = PSM + "WrapWithOrResult";
