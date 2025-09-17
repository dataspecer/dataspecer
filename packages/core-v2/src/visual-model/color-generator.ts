import { HexColor } from "./concepts/index.ts";
import { ModelIdentifier } from "./entity-model/entity-model.ts";

export interface ColorGenerator {

  /**
   * @returns A color for model with given identifier.
   */
  generateModelColor(model: ModelIdentifier): HexColor;

}

function generateColor(identifier: string, brightness: number): HexColor {
  let sum: number = 0;
  for (let i = 0; i < identifier.length; i++) {
    sum += identifier.charCodeAt(i);
  }

  const offset = brightness;
  const range = 255 - offset;
  // Generate reg, green and blue.
  // We shift this be the offset and update by range to get
  // a value between brightness and 255.
  const r = Math.floor(sinusTransformation(sum + 1) * range) + offset;
  const g = Math.floor(sinusTransformation(sum + 2) * range) + offset;
  const b = Math.floor(sinusTransformation(sum + 3) * range) + offset;

  // Generate hex value.
  let color = "#";
  color += ("00" + r.toString(16)).slice(-2).toUpperCase();
  color += ("00" + g.toString(16)).slice(-2).toUpperCase();
  color += ("00" + b.toString(16)).slice(-2).toUpperCase();
  return color;
}

const sinusTransformation = (value: number): number => {
  return Number("0." + Math.sin(value + 1).toString().slice(-7));
}

class DefaultColorGenerator implements ColorGenerator {
  generateModelColor(model: ModelIdentifier): HexColor {
    return generateColor(model, 64);
  }

}

export function createColorGenerator(): ColorGenerator {
  return new DefaultColorGenerator();
}
