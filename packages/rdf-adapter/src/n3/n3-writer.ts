import N3 from "n3";

export interface N3Writer {

  addQuads(quads: N3.Quad[]): void;

  asString(): Promise<string>;

  asPrettyString(): Promise<string>;

}

class DefaultN3Writer {

  writer: N3.Writer;

  constructor(prefixes: { [prefix: string]: string }) {
    this.writer = new N3.Writer({ prefixes });
  }

  addQuads(quads: N3.Quad[]): void {
    this.writer.addQuads(quads);
  }

  asString(): Promise<string> {
    return new Promise((resolve, reject) => this.writer.end((error, result) => {
      if (error) {
        reject(error);
      } else {
        resolve(result);
      }
    }));
  }

  asPrettyString(): Promise<string> {
    return this.asString().then(value => prettyPrintTurtle(value));
  }

}

/**
 * Add an empty line before each resource section.
 */
function prettyPrintTurtle(turtle: string): string {
  const lines = turtle.split(/\r?\n|\r|\n/g);
  const linesNext = [];
  for (const line of lines) {
    linesNext.push(line);
    if (line.startsWith("@prefix")) {
      continue;
    }
    if (line.endsWith(".")) {
      linesNext.push("");
    }
  }
  return linesNext.join("\n");
}

export function createN3Writer(
  prefixes: { [prefix: string]: string },
): N3Writer {
  return new DefaultN3Writer(prefixes);
}
