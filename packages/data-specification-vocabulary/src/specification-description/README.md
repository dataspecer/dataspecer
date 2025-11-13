# Data Specification Vocabulary - Specification Description part (metadata)

This subpackage is responsible for generating and processing DSV metadata, that are usually embedded in an HTML documentation and point to other artifacts such as owl vocabularies, DSV profiles, data structures and others.

See https://mff-uk.github.io/data-specification-vocabulary/#embedded-specification-metadata.

## API

- Use `DSVMetadataToJsonLdString` to generate string containing JSON data that can be embedded into HTML.
- Use `JsonLdStringToDSVMetadata` to convert the same string back to the model, or use `rdfToDSVMetadata` to pass RDF quads.
