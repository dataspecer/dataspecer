
export interface CmeConfiguration {

  /**
   * Dataspecer backend API URL.
   */
  backend: string;

}

export function createCmeConfiguration(): CmeConfiguration {
  return {
    backend: import.meta.env.VITE_PUBLIC_APP_BACKEND!,
  }
};
