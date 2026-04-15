# XSLT generator

This directory contains the source codes used by generators of [XSL Transformations 2.0](https://www.w3.org/TR/xslt20/).

There are two XSLT generators, one used for lifting (XML instance to RDF/XML) and one used for lowering (SPARQL XML Results to XML instance). The XSLT generators share a common simplified XSLT model describing the structure of the transformation, produced in the first step of the generation, and only differ in the second step which writes out the actual XSLT document.

The simplified model is described in `xslt-model.ts`, starting from the `XmlTransformation` class. This model describes templates (created from classes) and matches (created from properties).

## XSLT adapter

The common XSLT model is produced by the `XsltAdapter` class in `xslt-model-adapter.ts`, from the structure model.

Individual schema root classes are converted in `rootToTemplate`, producing an instance of `XmlRootTemplate`. The purpose of this template is to match the node that identifies the root class, and call its respective specific template.

All classes in the model are converted in `classToTemplate` to named templates (`XmlTemplate`). Each template consists of a collection of matches (`XmlMatch`) for its individual properties, produced in `propertyToMatch`.

The type of the match differs based on the type of the datatypes (associations, attributes, containers), checked and selected by `propertyToMatchCheckType`.

Attributes are turned into an `XmlLiteralMatch` in `datatypePropertyToLiteralMatch`. This match corresponds to an RDF literal with a specific datatype.

Container properties are turned into an `XmlContainerMatch` in `propertyToContainerMatch`. These represent grouping elements (e.g., `xs:sequence`, `xs:choice`) that wrap multiple inner properties. Each property within the container is converted to its appropriate match type.

Associations are turned into an `XmlClassMatch`, matching an IRI node with a particular class. Each class in the range of the property is turned into an `XmlClassTargetTemplate` in `classTargetTypeTemplate`, necessary to select the appropriate template if there are multiple classes.

## XSLT writer

The XSLT writers are located in `xslt-lifting-writer.ts` and `xslt-lowering-writer.ts`. The parts of the transformation are written in steps in `writeTransformationBegin`, `writeImports`, `writeSettings`, `writeRootTemplates`, `writeCommonTemplates`, `writeTemplates`, `writeFinalTemplates`, and `writeTransformationEnd`.

For the remaining part of the process, the writers are significantly different.

### Lifting

The lifting transformation matches the root element based on `XmlRootTemplate.elementName`, calling its respective template. Each named template produces an `<rdf:Description>`.

Named templates work by matching properties (via `<xsl:for-each>`) based on the QName in `XmlMatch.propertyName`, producing an RDF/XML property arc element (with name taken from `XmlMatch.interpretation`) and calling the appropriate class's template inside.

Container matches (of type `XmlContainerMatch`) are handled by iterating over each container element and processing its inner properties within that context. This allows the transformation to correctly handle grouped elements.

If there are multiple classes in the range of a property, an `<xsl:choose>` is performed on the `xsi:type` attribute to determine the specific class.

Reverse properties require special handling in the transformation. A reverse property produces a temporary `<top-level>` element storing an `<rdf:Description>` of its object that points back to the subject. When the main part of the transformation is done, the results are processed again, removing all `<top-level>` elements and moving their contents to the top-level `<rdf:RDF>` element.

### Lowering

The lowering transformation works by matching the XML results of a SPARQL query in the form of `SELECT ?s ?p ?o WHERE { ?s ?p ?o . }`, equivalent to a table of triples decomposed into their subject, predicate and object components. Use of this serialization format is useful due to its simplicity when compared with RDF/XML.

Each root template matches an `<sp:result>` element that is effectively the serialization of a `?subject rdf:type ?type` triple, with the specific type provided in `XmlRootTemplate.classIri`. The `?subject` node is stored and passed to the appropriate named template, as the `$id` parameter.

Each match in a named template looks for an `<sp:result>` storing a triple where the predicate part is the `XmlMatch.propertyIri`, and the subject matches the `$id` parameter. The XML element based on `XmlMatch.propertyName` is produced from the match, with its value taken from the object node (for reverse properties, the role of subject and object is reversed here). For class matches, this becomes the new `$id` parameter when calling the respective template.

Container matches (of type `XmlContainerMatch`) create a container element that wraps multiple inner properties. Each inner property is matched separately within the SPARQL results and placed inside the container element. This allows reconstruction of the original XML structure with proper grouping of elements.
Multiple classes in the range of a property are turned into an `<xsl:choose>`, deciding based on the presence of the appropriate `?object rdf:type ?type` triple serialized in the results, similarly to how the root template is produced.