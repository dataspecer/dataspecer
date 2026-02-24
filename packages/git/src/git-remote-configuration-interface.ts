import { PUBLICATION_BRANCH_DEFAULT_NAME } from "./git-provider-api.ts";


export type ExportFormatType = "json" | "yaml";

export interface GitRemoteConfigurations {
  publicationBranch: string,
  exportFormat: ExportFormatType,
}

export function getGitRemoteConfigurationsDefaults(): GitRemoteConfigurations {
  return {
    publicationBranch: PUBLICATION_BRANCH_DEFAULT_NAME,
    exportFormat: "json",
  };
}