import type { /* Configuration, */ ConfigWithMeta } from "@dataspecer/core/configuration";
import type { ConfigWithDataSpecification } from "@dataspecer/core/data-specification/configuration";
import type { ConfigWithCsv } from "@dataspecer/csv/configuration";
import type { ConfigWithDiagram } from "@dataspecer/diagram";
import type { ConfigWithDocumentation } from "@dataspecer/documentation";
import type { ConfigWithJson } from "@dataspecer/json/configuration";
import type { ConfigWithLayout } from "@dataspecer/layout";
import type { ConfigWithShacl } from "@dataspecer/shacl-v2";
import type { ConfigWithXml } from "@dataspecer/xml/configuration";

/**
 * All known configuration options in this Dataspecer codebase. This is a
 * partial type, meaning that you can provide no configuration options at all.
 *
 * This does not imply that other configuration options are not allowed, nor
 * that the individual configuration scopes are not extensible.
 *
 * We explicitly omit the base Configuration type so the type safety is more strict.
 */
export type AllConfiguration = /* Configuration & */
  ConfigWithMeta &
  ConfigWithDataSpecification &
  ConfigWithCsv &
  ConfigWithDiagram &
  ConfigWithDocumentation &
  ConfigWithJson &
  ConfigWithLayout &
  ConfigWithShacl &
  ConfigWithXml;
