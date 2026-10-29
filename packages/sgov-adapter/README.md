# @dataspecer/sgov-adapter

`SgovAdapter` implements `CimAdapter` from `@dataspecer/core-v2/semantic-model/cim-adapter` and constructs semantic entities directly from SGOV RDF data. Entity IDs use the source IRIs.

Search returns ordered semantic classes. Class queries return the class and its direct generalizations, or an empty array when the class does not exist. Surroundings and hierarchy queries return arrays of semantic classes, relationships, and generalizations.

`createSgovModel(endpoint, httpFetch, id?)` wraps the adapter for consumers of `ExternalSemanticModel`.

Run `npm test` for offline tests and `npm run integration-test` for tests against the live [SGOV endpoint](https://slovník.gov.cz/sparql).
