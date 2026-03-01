import { PUBLICATION_BRANCH_DEFAULT_NAME } from "../git-provider-api.ts";


export type ExportFormatType = "json" | "yaml";

export function isExportFormatType(what?: string): what is ExportFormatType {
  return what === "json" || what === "yaml";
}

export function convertStringToExportFormat(exportFormatString?: string | null): ExportFormatType {
  const exportFormat = exportFormatString ?? getDefaultExportFormat();
  if (!isExportFormatType(exportFormat)) {
    throw new Error(`String ${exportFormat} is not in the available Export Formats`);
  }
  return exportFormat;
}


export type ExportVersionType = 1 | 2;

export function convertStringToExportVersion(what?: string): ExportVersionType {
  if (what === null) {
    return getDefaultExportVersion();
  }
  const num = Number(what);
  if (num === 1 || num === 2) {
    return num;
  }
  throw new Error(`Can not convert ${what} string to export version. Invalid input.`);
}


export interface GitRemoteConfigurations {
  publicationBranch: string;
  exportFormat: ExportFormatType;
  exportVersion: ExportVersionType;
}

export function getGitRemoteConfigurationsDefaults(): GitRemoteConfigurations {
  return {
    publicationBranch: PUBLICATION_BRANCH_DEFAULT_NAME,
    exportFormat: getDefaultExportFormat(),
    exportVersion: getDefaultExportVersion(),
  };
}

export function getDefaultExportVersion(): ExportVersionType {
  return 2;
}

export function getDefaultExportFormat(): ExportFormatType {
  return "json";
}
