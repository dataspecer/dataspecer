import { CoreOperation, CoreOperationExecutor } from "../../core/index.ts";
import * as Operations from "../operation/index.ts";
import { executesPimCreateAssociation } from "./pim-create-association-executor.ts";
import { executePimCreateAttribute } from "./pim-create-attribute-executor.ts";
import { executePimCreateClass } from "./pim-create-class-executor.ts";
import { executePimCreateSchema } from "./pim-create-schema-executor.ts";
import { executePimDeleteAssociation } from "./pim-delete-association-executor.ts";
import { executePimDeleteAttribute } from "./pim-delete-attribute-executor.ts";
import { executePimDeleteClass } from "./pim-delete-class-executor.ts";
import { executePimSetDataType } from "./pim-set-datatype-executor.ts";
import { executePimSetHumanLabel } from "./pim-set-human-label-executor.ts";
import { executePimSetHumanDescription } from "./pim-set-human-description-executor.ts";
import { executePimSetTechnicalLabel } from "./pim-set-technical-label-executor.ts";
import { executePimSetExtends } from "./pim-set-extends-executor.ts";
import { executePimSetClassCodelist } from "./pim-set-class-codelist-executor.ts";
import { executePimSetCardinality } from "./pim-set-cardinality-executor.ts";
import { executePimSetExample } from "./pim-set-example-executor.ts";
import { executePimSetRegex } from "./pim-set-regex-executor.ts";
import { executePimSetObjectExample } from "./pim-set-object-example-executor.ts";

export const pimExecutors: CoreOperationExecutor<CoreOperation>[] = [
  CoreOperationExecutor.create(
    Operations.PimCreateAssociation.is,
    executesPimCreateAssociation,
    Operations.PimCreateAssociation.TYPE
  ),
  CoreOperationExecutor.create(
    Operations.PimCreateAttribute.is,
    executePimCreateAttribute,
    Operations.PimCreateAttribute.TYPE
  ),
  CoreOperationExecutor.create(
    Operations.PimCreateClass.is,
    executePimCreateClass,
    Operations.PimCreateClass.TYPE
  ),
  CoreOperationExecutor.create(
    Operations.PimCreateSchema.is,
    executePimCreateSchema,
    Operations.PimCreateSchema.TYPE
  ),
  CoreOperationExecutor.create(
    Operations.PimDeleteAssociation.is,
    executePimDeleteAssociation,
    Operations.PimDeleteAssociation.TYPE
  ),
  CoreOperationExecutor.create(
    Operations.PimDeleteAttribute.is,
    executePimDeleteAttribute,
    Operations.PimDeleteAttribute.TYPE
  ),
  CoreOperationExecutor.create(
    Operations.PimDeleteClass.is,
    executePimDeleteClass,
    Operations.PimDeleteClass.TYPE
  ),
  CoreOperationExecutor.create(
    Operations.PimSetCardinality.is,
    executePimSetCardinality,
    Operations.PimSetCardinality.TYPE
  ),
  CoreOperationExecutor.create(
    Operations.PimSetClassCodelist.is,
    executePimSetClassCodelist,
    Operations.PimSetClassCodelist.TYPE
  ),
  CoreOperationExecutor.create(
    Operations.PimSetDatatype.is,
    executePimSetDataType,
    Operations.PimSetDatatype.TYPE
  ),
  CoreOperationExecutor.create(
    Operations.PimSetExample.is,
    executePimSetExample,
    Operations.PimSetExample.TYPE
  ),
  CoreOperationExecutor.create(
    Operations.PimSetExtends.is,
    executePimSetExtends,
    Operations.PimSetExtends.TYPE
  ),
  CoreOperationExecutor.create(
    Operations.PimSetHumanLabel.is,
    executePimSetHumanLabel,
    Operations.PimSetHumanLabel.TYPE
  ),
  CoreOperationExecutor.create(
      Operations.PimSetObjectExample.is,
      executePimSetObjectExample,
      Operations.PimSetObjectExample.TYPE
  ),
  CoreOperationExecutor.create(
    Operations.PimSetHumanDescription.is,
    executePimSetHumanDescription,
    Operations.PimSetHumanDescription.TYPE
  ),
  CoreOperationExecutor.create(
    Operations.PimSetTechnicalLabel.is,
    executePimSetTechnicalLabel,
    Operations.PimSetTechnicalLabel.TYPE
  ),
  CoreOperationExecutor.create(
    Operations.PimSetRegex.is,
    executePimSetRegex,
    Operations.PimSetRegex.TYPE
  ),
];
