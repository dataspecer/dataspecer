import { CoreOperation, CoreOperationExecutor } from "../../../core/index.ts";
import * as Operations from "../operation/index.ts";
import { executeDataPsmSetGmlTypeXmlExtension } from "./data-psm-set-gml-type-xml-extension.ts";
import { executeDataPsmSetIsXmlAttribute } from "./data-psm-set-is-xml-attribute.ts";
import { executeDataPsmSetNamespaceXmlExtension } from "./data-psm-set-namespace-executor-xml-extension.ts";
import { executeDataPsmSetXmlSkipRootElement } from "./data-psm-set-xml-skip-root-element.ts";

export const xmlDataPsmExecutors: CoreOperationExecutor<CoreOperation>[] = [
  CoreOperationExecutor.create(
    Operations.DataPsmSetGmlTypeXmlExtension.is,
    executeDataPsmSetGmlTypeXmlExtension,
    Operations.DataPsmSetGmlTypeXmlExtension.TYPE
  ),
  CoreOperationExecutor.create(
    Operations.DataPsmSetIsXmlAttribute.is,
    executeDataPsmSetIsXmlAttribute,
    Operations.DataPsmSetIsXmlAttribute.TYPE
  ),
  CoreOperationExecutor.create(
    Operations.DataPsmSetNamespaceXmlExtension.is,
    executeDataPsmSetNamespaceXmlExtension,
    Operations.DataPsmSetNamespaceXmlExtension.TYPE
  ),
  CoreOperationExecutor.create(
    Operations.DataPsmSetXmlSkipRootElement.is,
    executeDataPsmSetXmlSkipRootElement,
    Operations.DataPsmSetXmlSkipRootElement.TYPE
  ),
];
