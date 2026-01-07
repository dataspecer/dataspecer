import { CoreOperation, CoreOperationExecutor } from "../../core/index.ts";
import * as Operations from "../operation/index.ts";
import { executeDataPsmCreateAssociationEnd } from "./data-psm-create-association-end-executor.ts";
import { executeDataPsmCreateAttribute } from "./data-psm-create-attribute-executor.ts";
import { executeDataPsmCreateClass } from "./data-psm-create-class-executor.ts";
import { executeDataPsmCreateClassReference } from "./data-psm-create-class-reference-executor.ts";
import { executeDataPsmCreateContainer } from "./data-psm-create-container-executor.ts";
import { executeDataPsmCreateExternalRoot } from "./data-psm-create-external-root-executor.ts";
import { executeDataPsmCreateInclude } from "./data-psm-create-include-executor.ts";
import { executeDataPsmCreateOr } from "./data-psm-create-or-executor.ts";
import { executeDataPsmCreateSchema } from "./data-psm-create-schema-executor.ts";
import { executeDataPsmDeleteAssociationEnd } from "./data-psm-delete-association-end-executor.ts";
import { executeDataPsmDeleteAttribute } from "./data-psm-delete-attribute-executor.ts";
import { executeDataPsmDeleteClass } from "./data-psm-delete-class-executor.ts";
import { executeDataPsmDeleteClassReference } from "./data-psm-delete-class-reference-executor.ts";
import { executeDataPsmDeleteContainer } from "./data-psm-delete-container-executor.ts";
import { executeDataPsmDeleteExternalRoot } from "./data-psm-delete-external-root-executor.ts";
import { executeDataPsmDeleteInclude } from "./data-psm-delete-include-executor.ts";
import { executeDataPsmDeleteOr } from "./data-psm-delete-or-executor.ts";
import { executeDataPsmMoveProperty } from "./data-psm-move-property-executor.ts";
import { executeDataPsmReplaceAlongInheritance } from "./data-psm-replace-along-inheritance.ts";
import { executeDataPsmSetCardinality } from "./data-psm-set-cardinality-executor.ts";
import { executeDataPsmSetChoice } from "./data-psm-set-choice-executor.ts";
import { executeDataPsmSetDatatype } from "./data-psm-set-datatype-executor.ts";
import { executeDataPsmSetDematerialize } from "./data-psm-set-dematerialize-executor.ts";
import { executeDataPsmSetEmptyAsComplex } from "./data-psm-set-empty-as-complex.ts";
import { executeDataPsmSetExternalRootTypes } from "./data-psm-set-external-root-types-executor.ts";
import { executeDataPsmSetHumanDescription } from "./data-psm-set-human-description-executor.ts";
import { executeDataPsmSetHumanLabel } from "./data-psm-set-human-label-executor.ts";
import { executeDataPsmSetProfiling } from "./data-psm-set-profiling-executor.ts";
import { executeDataPsmSetIdType } from "./data-psm-set-idtype-executor.ts";
import { executeDataPsmSetInstancesHaveIdentity } from "./data-psm-set-instances-have-identity.ts";
import { executeDataPsmSetInstancesSpecifyTypes } from "./data-psm-set-instances-specify-type.ts";
import { executeDataPsmSetInterpretation } from "./data-psm-set-interpretation-executor.ts";
import { executeDataPsmSetIsClosed } from "./data-psm-set-is-closed-executor.ts";
import { executeDataPsmSetJsonEnforceContext } from "./data-psm-set-json-enforce-context-executor.ts";
import { executeDataPsmSetJsonLdDefinedPrefixes } from "./data-psm-set-json-ld-defined-prefixes-executor.ts";
import { executeDataPsmSetJsonLdTypeMapping } from "./data-psm-set-json-ld-type-mapping-executor.ts";
import { executeDataPsmSetJsonSchemaPrefixesInIriRegex } from "./data-psm-set-json-schema-prefixes-in-iri-regex-executor.ts";
import { executeDataPsmSetOrder } from "./data-psm-set-order-executor.ts";
import { executeDataPsmSetPart } from "./data-psm-set-part-executor.ts";
import { executeDataPsmSetRootCollection } from "./data-psm-set-root-collection-executor.ts";
import { executeDataPsmSetRoots } from "./data-psm-set-roots-executor.ts";
import { executeDataPsmSetTechnicalLabel } from "./data-psm-set-technical-label-executor.ts";
import { executeDataPsmUnsetChoice } from "./data-psm-unset-choice-executor.ts";
import { executeDataPsmUnwrapOr } from "./data-psm-unwrap-or-executor.ts";
import { executeDataPsmWrapWithOr } from "./data-psm-wrap-with-or-executor.ts";

export const baseDataPsmExecutors: CoreOperationExecutor<CoreOperation>[] = [
  CoreOperationExecutor.create(
    Operations.DataPsmCreateAssociationEnd.is,
    executeDataPsmCreateAssociationEnd,
    Operations.DataPsmCreateAssociationEnd.TYPE
  ),
  CoreOperationExecutor.create(
    Operations.DataPsmCreateAttribute.is,
    executeDataPsmCreateAttribute,
    Operations.DataPsmCreateAttribute.TYPE
  ),
  CoreOperationExecutor.create(
    Operations.DataPsmCreateClass.is,
    executeDataPsmCreateClass,
    Operations.DataPsmCreateClass.TYPE
  ),
  CoreOperationExecutor.create(
    Operations.DataPsmCreateClassReference.is,
    executeDataPsmCreateClassReference,
    Operations.DataPsmCreateClassReference.TYPE
  ),
  CoreOperationExecutor.create(
    Operations.DataPsmCreateExternalRoot.is,
    executeDataPsmCreateExternalRoot,
    Operations.DataPsmCreateExternalRoot.TYPE
  ),
  CoreOperationExecutor.create(
    Operations.DataPsmCreateInclude.is,
    executeDataPsmCreateInclude,
    Operations.DataPsmCreateInclude.TYPE
  ),
  CoreOperationExecutor.create(
    Operations.DataPsmCreateOr.is,
    executeDataPsmCreateOr,
    Operations.DataPsmCreateOr.TYPE
  ),
  CoreOperationExecutor.create(
    Operations.DataPsmCreateSchema.is,
    executeDataPsmCreateSchema,
    Operations.DataPsmCreateSchema.TYPE
  ),
  CoreOperationExecutor.create(
    Operations.DataPsmDeleteAssociationEnd.is,
    executeDataPsmDeleteAssociationEnd,
    Operations.DataPsmDeleteAssociationEnd.TYPE
  ),
  CoreOperationExecutor.create(
    Operations.DataPsmDeleteAttribute.is,
    executeDataPsmDeleteAttribute,
    Operations.DataPsmDeleteAttribute.TYPE
  ),
  CoreOperationExecutor.create(
    Operations.DataPsmDeleteClass.is,
    executeDataPsmDeleteClass,
    Operations.DataPsmDeleteClass.TYPE
  ),
  CoreOperationExecutor.create(
    Operations.DataPsmDeleteClassReference.is,
    executeDataPsmDeleteClassReference,
    Operations.DataPsmDeleteClassReference.TYPE
  ),
  CoreOperationExecutor.create(
    Operations.DataPsmDeleteExternalRoot.is,
    executeDataPsmDeleteExternalRoot,
    Operations.DataPsmDeleteExternalRoot.TYPE
  ),
  CoreOperationExecutor.create(
    Operations.DataPsmDeleteInclude.is,
    executeDataPsmDeleteInclude,
    Operations.DataPsmDeleteInclude.TYPE
  ),
  CoreOperationExecutor.create(
    Operations.DataPsmDeleteOr.is,
    executeDataPsmDeleteOr,
    Operations.DataPsmDeleteOr.TYPE
  ),
  CoreOperationExecutor.create(
    Operations.DataPsmMoveProperty.is,
    executeDataPsmMoveProperty,
    Operations.DataPsmMoveProperty.TYPE
  ),
  CoreOperationExecutor.create(
    Operations.DataPsmReplaceAlongInheritance.is,
    executeDataPsmReplaceAlongInheritance,
    Operations.DataPsmReplaceAlongInheritance.TYPE
  ),
  CoreOperationExecutor.create(
    Operations.DataPsmSetCardinality.is,
    executeDataPsmSetCardinality,
    Operations.DataPsmSetCardinality.TYPE
  ),
  CoreOperationExecutor.create(
    Operations.DataPsmSetChoice.is,
    executeDataPsmSetChoice,
    Operations.DataPsmSetChoice.TYPE
  ),
  CoreOperationExecutor.create(
    Operations.DataPsmSetDatatype.is,
    executeDataPsmSetDatatype,
    Operations.DataPsmSetDatatype.TYPE
  ),
  CoreOperationExecutor.create(
    Operations.DataPsmSetHumanDescription.is,
    executeDataPsmSetHumanDescription,
    Operations.DataPsmSetHumanDescription.TYPE
  ),
  CoreOperationExecutor.create(
    Operations.DataPsmSetHumanLabel.is,
    executeDataPsmSetHumanLabel,
    Operations.DataPsmSetHumanLabel.TYPE
  ),
  CoreOperationExecutor.create(
    Operations.DataPsmSetProfiling.is,
    executeDataPsmSetProfiling,
    Operations.DataPsmSetProfiling.TYPE
  ),
  CoreOperationExecutor.create(
    Operations.DataPsmSetIdType.is,
    executeDataPsmSetIdType,
    Operations.DataPsmSetIdType.TYPE
  ),
  CoreOperationExecutor.create(
    Operations.DataPsmSetInstancesHaveIdentity.is,
    executeDataPsmSetInstancesHaveIdentity,
    Operations.DataPsmSetInstancesHaveIdentity.TYPE
  ),
  CoreOperationExecutor.create(
    Operations.DataPsmSetInstancesSpecifyTypes.is,
    executeDataPsmSetInstancesSpecifyTypes,
    Operations.DataPsmSetInstancesSpecifyTypes.TYPE
  ),
  CoreOperationExecutor.create(
    Operations.DataPsmSetInterpretation.is,
    executeDataPsmSetInterpretation,
    Operations.DataPsmSetInterpretation.TYPE
  ),
  CoreOperationExecutor.create(
    Operations.DataPsmSetIsClosed.is,
    executeDataPsmSetIsClosed,
    Operations.DataPsmSetIsClosed.TYPE
  ),
  CoreOperationExecutor.create(
    Operations.DataPsmSetJsonEnforceContext.is,
    executeDataPsmSetJsonEnforceContext,
    Operations.DataPsmSetJsonEnforceContext.TYPE
  ),
  CoreOperationExecutor.create(
    Operations.DataPsmSetEmptyAsComplex.is,
    executeDataPsmSetEmptyAsComplex,
    Operations.DataPsmSetEmptyAsComplex.TYPE
  ),
  CoreOperationExecutor.create(
    Operations.DataPsmSetOrder.is,
    executeDataPsmSetOrder,
    Operations.DataPsmSetOrder.TYPE
  ),
  CoreOperationExecutor.create(
    Operations.DataPsmSetPart.is,
    executeDataPsmSetPart,
    Operations.DataPsmSetPart.TYPE
  ),
  CoreOperationExecutor.create(
    Operations.DataPsmSetTechnicalLabel.is,
    executeDataPsmSetTechnicalLabel,
    Operations.DataPsmSetTechnicalLabel.TYPE
  ),
  CoreOperationExecutor.create(
    Operations.DataPsmSetRootCollection.is,
    executeDataPsmSetRootCollection,
    Operations.DataPsmSetRootCollection.TYPE
  ),
  CoreOperationExecutor.create(
    Operations.DataPsmSetRoots.is,
    executeDataPsmSetRoots,
    Operations.DataPsmSetRoots.TYPE
  ),
  CoreOperationExecutor.create(
    Operations.DataPsmSetDematerialized.is,
    executeDataPsmSetDematerialize,
    Operations.DataPsmSetDematerialized.TYPE
  ),
  CoreOperationExecutor.create(
    Operations.DataPsmSetExternalRootTypes.is,
    executeDataPsmSetExternalRootTypes,
    Operations.DataPsmSetExternalRootTypes.TYPE
  ),
  CoreOperationExecutor.create(
    Operations.DataPsmUnsetChoice.is,
    executeDataPsmUnsetChoice,
    Operations.DataPsmUnsetChoice.TYPE
  ),
  CoreOperationExecutor.create(
    Operations.DataPsmUnwrapOr.is,
    executeDataPsmUnwrapOr,
    Operations.DataPsmUnwrapOr.TYPE
  ),
  CoreOperationExecutor.create(
    Operations.DataPsmWrapWithOr.is,
    executeDataPsmWrapWithOr,
    Operations.DataPsmWrapWithOr.TYPE
  ),
  CoreOperationExecutor.create(
    Operations.DataPsmCreateContainer.is,
    executeDataPsmCreateContainer,
    Operations.DataPsmCreateContainer.TYPE
  ),
  CoreOperationExecutor.create(
    Operations.DataPsmDeleteContainer.is,
    executeDataPsmDeleteContainer,
    Operations.DataPsmDeleteContainer.TYPE
  ),
  CoreOperationExecutor.create(
    Operations.DataPsmSetJsonLdDefinedPrefixes.is,
    executeDataPsmSetJsonLdDefinedPrefixes,
    Operations.DataPsmSetJsonLdDefinedPrefixes.TYPE
  ),
  CoreOperationExecutor.create(
    Operations.DataPsmSetJsonLdDefinedTypeMapping.is,
    executeDataPsmSetJsonLdTypeMapping,
    Operations.DataPsmSetJsonLdDefinedTypeMapping.TYPE
  ),
  CoreOperationExecutor.create(
    Operations.DataPsmSetJsonSchemaPrefixesInIriRegex.is,
    executeDataPsmSetJsonSchemaPrefixesInIriRegex,
    Operations.DataPsmSetJsonSchemaPrefixesInIriRegex.TYPE
  ),
];
