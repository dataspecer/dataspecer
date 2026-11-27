# @dataspecer/xml

## How to treat names and types for XML

Technical labels are in parentheses.

### Association to classes

In this section, suppose we enable **extract types**.

```
RootClass (R)
  - association (A) to class (C)
```
```xml
...
<xs:element name="A" type="C"/>
<xs:complexType name="C"> ... </xs:complexType>
```

### The root itself

Our PSM has object in root, this corresponds to complexType in root. But if we want an element as well, then you need to add technical label to root.

```
- virtual root association (X) to RootClass (R)
    - association (A) to class (C)
```
```xml
<!-- public root element -->
<xs:element name="X" type="R"/>
<!-- public root type -->
<xs:complexType name="C">
  <!-- the rest is here if extract types disabled -->
</xs:complexType>
```

> [!NOTE]
> If a technical label for the virtual root association (X in our example) is missing, the technical label for class will be used (R in our example).

> [!CAUTION]
> Because the current PSMv1 does not support *root associations* (there is schema which links straight to class), we use schema label as a root association label


## Controlled vocabularies in the XML Schema

A class profile (represented in data by an object or just the IRI of a value) can be assigned controlled vocabularies (CV). Each controlled vocabulary has a regex pattern that its IRIs match, and the assignment defines the expected usage of a controlled vocabulary, meaning if a value from a vocabulary: *must* be used for the class profile, *at least one* value must be from CV, it is *recommended* or *may* be used. The XML Schema checks what it can of these rules.

### How the rules become XSD

There are two kinds of rules, checked in two different ways.

**Every value must match** (*must*, and *recommended* when the specification restricts to the recommended controlled vocabulary). The IRI gets a simple type that only accepts IRIs matching the pattern:

```xml
<xs:simpleType name="distribution-iri">
  <xs:restriction base="xs:anyURI">
    <xs:pattern value="http://example\.com/cv-a/[a-z]+"/>
  </xs:restriction>
</xs:simpleType>
```

When there are several rules, the IRI has to match all of them. Several `xs:pattern` in one restriction would mean *any of them*, so each rule gets a type of its own, and the types are nested into each other. So a value of the last type matches every pattern in the chain:

```xml
<!-- the regular expression of the class -->
<xs:simpleType name="distribution-iri-1">
  <xs:restriction base="xs:anyURI">
    <xs:pattern value="http://example\.com/cv-a/r.*"/>
  </xs:restriction>
</xs:simpleType>
<!-- controlled vocabulary A, on top of the previous rule -->
<xs:simpleType name="distribution-iri">
  <xs:restriction base="distribution-iri-1">
    <xs:pattern value="http://example\.com/cv-a/[a-z]+"/>
  </xs:restriction>
</xs:simpleType>
```

The element or attribute with the IRI uses the last type, `distribution-iri`.

**At least one value must match** (*at least one*, and *recommended* when the specification requires a recommended value). A simple type sees one value at a time, so it cannot say that some value among several has to match. This is written as an `xs:assert` on the complex type of the parent, which sees all its children:

```xml
<xs:assert test="not(*:distribution) or *:distribution/*:iri[matches(., '^(http://example\.com/cv-a/[a-z]+)$')]"/>
```

It is satisfied when the property has no value (its cardinality is checked separately), or when at least one value matches. Each rule is an assertion of its own, so all of them have to be satisfied.

`xs:assert` is a part of XML Schema 1.1, so a validator for XML Schema 1.0 (such as xmllint) refuses a schema that has one. The *may* rules do not restrict anything.

### Regular expressions

The patterns are regular expressions written for ECMAScript, such as `^http://example\.com/[a-z]+$`. XML Schema has its own dialect, so they are converted by [`convertPatternToXsd`](src/xml-schema/xml-schema-rules.ts):

- An `xs:pattern` always matches the whole value, and `^` and `$` would be ordinary characters, so the anchors are removed. A side that is not anchored gets `.*` instead, because ECMAScript finds the pattern anywhere in the value.
- `\d` and `\w` become `[0-9]` and `[A-Za-z0-9_]`, as in XML Schema they accept more characters.
- `(?:` becomes `(` and a backslash before a character that needs none (`\/`) is dropped.
- A pattern with something XML Schema cannot express (lookahead, back references, lazy quantifiers, `\b`, ...) is not written to the schema, and the generator logs a warning. The documentation still lists it.

The same conversion is used for the regular expression of a class, so it works as an XML Schema pattern too. For the XPath of an assertion the converted pattern is wrapped as `^(pattern)$`, as `matches()` does not match the whole value by itself.

### Implementation

- [`xml-schema-rules.ts`](src/xml-schema/xml-schema-rules.ts) collects the rules of a class (its regular expression first, then the controlled vocabularies) and converts their patterns. The choice of which controlled vocabulary rules apply is shared with the other generators (`getControlledVocabularyRules` in `@dataspecer/generators`).
- [`xml-schema-iri-type.ts`](src/xml-schema/xml-schema-iri-type.ts) creates the chain of named simple types from the rules. The adapter, [`xml-schema-model-adapter.ts`](src/xml-schema/xml-schema-model-adapter.ts), adds them to the schema and gives a number to a name already used with a different definition.
- [`xml-schema-assertions.ts`](src/xml-schema/xml-schema-assertions.ts) creates the `xs:assert` of a complex type for the *at least one* rules.
- A class without properties is just an IRI. It becomes a primitive type that carries the controlled vocabularies of the class, so the rules apply to the value itself and not to an `iri` child.
