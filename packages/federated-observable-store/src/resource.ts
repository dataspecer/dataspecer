import { Entity } from "@dataspecer/core-v2";
import { CoreResource } from "@dataspecer/core/core";

/**
 * {@link CoreResource} wrapper for easier manipulation with the resource if
 * still being loaded, the loading failed or the resource is being updated.
 *
 * When loading, the last known value is stored in resource field so the app can
 * render at least obsoleted value.
 * @immutable
 */
export interface Resource<ResourceType extends CoreResource | Entity = CoreResource | Entity> {
  /**
   * The {@link CoreResource} or null, if error or loading for the first time.
   * If the resource is being reloaded, the old value is still stored here.
   */
  resource: ResourceType | null;
  isLoading: boolean;
}
