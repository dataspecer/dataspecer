import * as N3 from "n3";

const IRI = N3.DataFactory.namedNode;

function endWriter(writer: N3.Writer): Promise<string> {
  return new Promise((resolve, reject) => writer.end((error, result) => {
    if (error) {
      reject(error);
    } else {
      resolve(result);
    }
  }));
}

test("Writer error", async () => {
  const writer = new N3.Writer({
    prefixes: {
      "": "",
    }
  });

  writer.addQuad(IRI("s"), IRI("p"), IRI("o"));
  writer.addQuad(IRI("s"), IRI("p"), IRI("i"));

  writer.addQuad(IRI("http://google.com/this-is"), IRI("is-this"), IRI("end"));
  writer.addQuad(IRI("http://google.com/d"), IRI("is-this"), IRI("end"));


  const result = await endWriter(writer);

  console.log(result)
});