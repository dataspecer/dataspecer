import N3 from "n3";

export interface N3Reader {

  parse(value: string): Promise<N3.Quad[]>;

}

function stringN3ToRdf(
  document: string,
  format: N3.BaseFormat,
): Promise<N3.Quad[]> {
  return new Promise((accept, reject) => {
    const parser = new N3.Parser({ format });
    const collector: N3.Quad[] = [];
    parser.parse(document, (error, quad) => {
      if (quad === null) {
        accept(collector);
      } else if (error) {
        reject(error);
      } else {
        collector.push(quad);
      }
    });
  });
}

export function createN3Reader(format: N3.BaseFormat): N3Reader {
  return {
    parse: (value) => stringN3ToRdf(value, format)
  }
}
