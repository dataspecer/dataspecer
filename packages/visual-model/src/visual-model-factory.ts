import { wrapWithColorGenerator } from "./color-generator-wrap.ts";
import { DefaultVisualModel } from "./default-visual-model.ts";
import { WritableVisualModel } from "./writable-visual-model.ts";

export interface VisualModelFactory {

  /**
   * Temporary method till the internal entity model is aligned with
   * the external one.
   *
   * @deprecated Use other method instead.
   */
  createNewWritableVisualModelSync(
    identifier: string | null,
  ): WritableVisualModel;

}

class DefaultVisualModelFactory implements VisualModelFactory {

  createNewWritableVisualModelSync(identifier: string | null) {
    if (identifier === null) {
      identifier = createIdentifier();
    }
    return wrapWithColorGenerator(new DefaultVisualModel(identifier));
  }

}

const createIdentifier = () => (Math.random() + 1).toString(36).substring(7);

const factory = new DefaultVisualModelFactory();

export function createDefaultVisualModelFactory() {
  return factory;
}
