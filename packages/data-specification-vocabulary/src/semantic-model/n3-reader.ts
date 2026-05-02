import N3 from "n3";

export function stringN3ToRdf(
  document: string,
  format: N3.BaseFormat | undefined = undefined,
): Promise<N3.Quad[]> {
  return new Promise((accept, reject) => {
    const parser = new N3.Parser({ format });
    const collector: N3.Quad[] = [];
    parser.parse(document, (error, quad, prefixes) => {
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
