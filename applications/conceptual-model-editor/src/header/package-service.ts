import {
  type FetchOptions,
  type FetchResponse,
  type HttpFetch
} from "@dataspecer/core/io/fetch/fetch-api";
import { BackendPackageService, type Package } from "@dataspecer/core-v2/project";
import { httpFetch } from "@dataspecer/core/io/fetch/fetch-browser";

export interface PackageService {
  /**
   * Fetch information about a package.
   */
  getPackage: (identifier: string) => Promise<Package>;
  /**
   * Return information about the root package.
   */
  getRootPackage: (identifier: string) => Promise<Package>;

  /**
   * Return the package configuration - important to set layouting configuration.
   */
  getPackageConfiguration: (identifier: string) => Promise<object | null>;

  /**
   * Saves package configuration given in parameter to the backend.
   */
  savePackageConfiguration: (packageIdentifier: string, newPackageConfiguration: object) => void;
}

const fetchService: FetchService = {
  fetch: (url: string, options?: FetchOptions): Promise<FetchResponse> => {
    return httpFetch(url, options);
  },
};

export interface FetchService {
  /**
   * Execute HTTP request.
   */
  fetch: HttpFetch;
}

const backendService = new BackendPackageService(import.meta.env.VITE_PUBLIC_APP_BACKEND!, fetchService.fetch);

const backendPackageRootUrl = import.meta.env.VITE_PUBLIC_APP_BACKEND_PACKAGE_ROOT!;

const getPackage = (identifier: string): Promise<Package> => {
  return backendService.getPackage(identifier);
};

const getRootPackage = () => getPackage(backendPackageRootUrl);

const getPackageConfiguration = (
  identifier: string
) => getPackage(identifier).then(fetchedPackage => backendService.getResourceJsonData(fetchedPackage.iri));

const savePackageConfiguration = (
  packageIdentifier: string,
  newPackageConfiguration: object
) => backendService.setResourceJsonData(packageIdentifier, newPackageConfiguration);

export const packageService: PackageService = {
  getPackage,
  getRootPackage,
  getPackageConfiguration,
  savePackageConfiguration,
};
