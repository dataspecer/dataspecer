import { CoreOperationExecutor } from "../core/index.ts";
import type { Operation } from "../operation/index.ts";
import { baseDataPsmExecutors } from "./executor/index.ts";
import { jsonDataPsmExecutors } from "./json-extension/executor/xml-data-psm-executor.ts";
import { xmlDataPsmExecutors } from "./xml-extension/executor/xml-data-psm-executor.ts";

export const dataPsmExecutors: CoreOperationExecutor<Operation>[] = [
  ...baseDataPsmExecutors,
  ...xmlDataPsmExecutors,
  ...jsonDataPsmExecutors,
]
