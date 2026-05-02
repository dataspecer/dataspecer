# XSLT Roundtrip Demo

Quick playground for testing a roundtrip transformation:

- XML -> RDF/XML (lifting XSLT)
- RDF/XML -> Turtle (Node script)
- Turtle -> SPARQL XML Results-like format (Node script)
- SPARQL XML Results -> XML (lowering XSLT)

## Files

- `01-data.xml` sample input XML
- `02-schema.xsd` XML schema for input
- `03-lifting.xslt` lifting transform (XML to RDF/XML)
- `04-rdf.xml` generated RDF/XML
- `05-rdf.ttl` generated Turtle
- `06-rdf-sparql.xml` generated SPARQL Results XML-like input for lowering
- `07-lowering.xslt` lowering transform (SPARQL Results to XML)
- `08-transformed.xml` generated output XML
- `xml2ttl.mjs` RDF/XML -> Turtle converter (rdflib)
- `ttl2sparql-result.mjs` Turtle -> SPARQL Results XML-like converter
- `run.sh` full end-to-end pipeline

Execute the full pipeline:

```bash
bash run.sh
```

You should see `done.` and the generated files `04-rdf.xml`, `05-rdf.ttl`, `06-rdf-sparql.xml`, and `08-transformed.xml` will be updated.
