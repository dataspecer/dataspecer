# EU Vocabularies source (Reference Data Catalogue)

Finds vocabularies of the EU Vocabularies Reference Data Catalogue (Publications Office) and prefills the vocabulary form from them.

## Endpoint: why data.europa.eu
`https://data.europa.eu/sparql` 
- European Data Portal - Virtuoso, GET. It supports CORS, so the browser can call it.
- **Not usable:** the Cellar endpoint `https://publications.europa.eu/webapi/rdf/sparql` has the raw SKOS schemes and concepts, but sends **no CORS headers**, so a browser blocks it. Using it would need a backend proxy.
- **Download files have no CORS either.** - The distribution files therefore cannot be read and metadata is derived without them.
- Same Virtuoso cost limit as NKD. A pattern that selects a title of one language directly on a single record, e.g. `FILTER(lang(?t)='en')`, is rejected as too expensive (a filter inside the query that lists all vocabularies is fine).
- **The whole catalogue is read once and paged locally.** - same as NKD


## What is a controlled vocabulary here
The catalogue is `http://data.europa.eu/88u/catalogue/publ`: 387 `dcat:Dataset` records.

Vocabularies are the records with `dct:type` (`…/authority/dataset-type/…`) **NAL, CODE_LIST, TAXONOMY or THESAURUS: 243 records** (176 NAL, 49 TAXONOMY, 10 THESAURUS, 8 CODE_LIST). Other types (IEPD 47, ENVIRONMENTAL 14, …) are left out.

A named authority list (NAL) is an EU authority table such as countries or languages.

The group of a vocabulary is its `dct:creator` if that is an IRI (named by its `skos:prefLabel`), else `dct:publisher`.

Search covers the English and Czech titles only, since only those are loaded for the listing.

## Distributions
- Rank: RDF/XML, Turtle, generic `RDF`, CSV, XML, JSON, then others (ZIP, XLS, …). Among files of one format the title decides: `SKOS_CORE`, `SKOS_AP_EU`, `SKOS_AP_ACT`, then others, then by IRI. So the default is usually the `SKOS_CORE` RDF/XML file.
- Only RDF/XML, Turtle and RDF carry SKOS (`conformsToSkos` true). Any other format gives false and the vocabulary is referenced by the file address.
- `readable` is true for every distribution of a NAL record and false for the other types. It only decides what the user is told; nothing is read from the file.

## How metadata are derived (`metadata.ts`)
| Form field | From |
|---|---|
| Name | all record `dct:title` (about 24 languages; untagged ones go under the UI language). The listing reads English and Czech only; the record read for the form has all of them. Only English and a few Czech ones are real, most others are machine translations tagged like `cs-t-en-t0-mtec`; `toLanguageString` (`../sparql-utils.ts`) cuts the tag to its primary subtag, and a bare tag (`cs`) wins over a derived one. |
| Documentation | `foaf:page`, else `dcat:landingPage` (both point to the vocabulary page on op.europa.eu) |
| Distributions | `dcat:distribution` -> `dct:title`, `dct:format` (EU file-type IRI, always present), `dcat:accessURL`, `dcat:downloadURL` (always present). A record has 1 to 29, many are XML schema files, not vocabularies. |
| Access / download URL | distribution `accessURL` / `downloadURL` (download checkbox on) |
| `conformsToSkos` | by format, see above |
| Scheme IRI | not in the record. **NAL only:** `http://publications.europa.eu/resource/authority/<dct:identifier>`, e.g. `country` (must match `[A-Za-z0-9._-]+`). Other types: empty + `noSchemeIri` warning. Non-SKOS distribution: the file address. |
| Regex | **NAL only:** from up to 200 values found with `?v skos:inScheme <scheme>` on data.europa.eu (`buildIriPattern`), plus 5 sample IRIs. If the catalogue has no values: the convention `^<scheme IRI>/.*$`, no samples, and the `patternByConvention` note (the form says no values were found). If the endpoint fails: the convention regex + `valuesNotLoaded` warning. |

### Why only NALs
- **NAL (176):** the scheme exists for 172 of 176. The IRIs of the values are always `<scheme IRI>/<code>`. But data.europa.eu holds the **values of only 22 of the 176** (the DCAT-AP-related ones, e.g. country, language, file-type, data-theme); for the other 154 the regex comes from the convention.
- **TAXONOMY / THESAURUS / CODE_LIST:** no usable convention. Scheme IRIs have per-dataset opaque namespaces (geonom2024 -> `data.europa.eu/4j8/geonom/geonom2024`, prodcom2024 -> `…/qw1/prodcom2024/prodcom2024`, nace2.1 -> `…/ux2/nace2.1/nace2.1`, cpa22 -> `…/ehl/cpa22/cpa22`, lucas2022 -> `…/oxm/lucas2022/lucas`, eurovoc -> `eurovoc.europa.eu/100141`, nuts -> `data.europa.eu/nuts`). 

## Known gaps and ideas
- Taxonomies, thesauri and code lists need manual scheme IRI and regex. A backend proxy to Cellar (or CORS on the Publications Office side) would allow looking the scheme up; a mapping table could cover the common ones.
- Czech titles are mostly machine translations.
- Distributions of other formats (CSV, XML) are listed but give no scheme IRI; the XML ones are often technical schema files.
