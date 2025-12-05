import type { Quad, Quad_Object } from "@rdfjs/types";
import jsonld from "jsonld";
import { DSV_APPLICATION_PROFILE_TYPE, DSV_VOCABULARY_SPECIFICATION_DOCUMENT_TYPE, type ExternalSpecification, type ResourceDescriptor, type Specification } from "./model.ts";
import { ADMS, DSV, OWL, PROF } from "./vocabulary.ts";
import * as N3 from "n3";
import type { LanguageString } from "@dataspecer/core/core/index";
import { mimeToIriMap } from "./utils.ts";
import { dsvMetadataWellKnown } from "./well-known.ts";

const RDF_TYPE = "http://www.w3.org/1999/02/22-rdf-syntax-ns#type";
const DCT_TITLE = "http://purl.org/dc/terms/title";
const DCT_DESCRIPTION = "http://purl.org/dc/terms/description";
const DCT_FORMAT = "http://purl.org/dc/terms/format";
const DCT_CONFORMS_TO = "http://purl.org/dc/terms/conformsTo";

/**
 * Parses RDF triples to DSV Metadata model.
 */
export function rdfToDSVMetadata(
  rdf: Quad[],
  params: {
    baseIri?: string;
  },
): Specification[] {
  const store = new N3.Store(rdf);
  const specifications = store.getSubjects(RDF_TYPE, PROF.Profile, null).map((specificationSubject) => {
    // For each specification

    const iriTypes = store.getObjects(specificationSubject, RDF_TYPE, null).map((obj) => obj.value);
    const types = [] as string[];
    if (iriTypes.includes(DSV.ApplicationProfile)) {
      types.push(DSV_APPLICATION_PROFILE_TYPE);
    }
    if (iriTypes.includes(OWL.Ontology)) {
      types.push(DSV_VOCABULARY_SPECIFICATION_DOCUMENT_TYPE);
    }

    return {
      iri: specificationSubject.value,
      types,

      title: quadToLanguageString(store.getObjects(specificationSubject, DCT_TITLE, null)),
      description: quadToLanguageString(store.getObjects(specificationSubject, DCT_DESCRIPTION, null)),

      isProfileOf: store.getObjects(specificationSubject, PROF.isProfileOf, null).map((profileOfSubject) => {
        // For each isProfileOf

        // todo do not know what to do when there are multiple URLs
        let url: string | undefined = undefined;

        const hasResource = store.getObjects(profileOfSubject.id, PROF.hasResource, null)[0]?.id;
        url ||= hasResource && store.getObjects(hasResource, PROF.hasArtifact, null)[0]?.id;
        // https://github.com/dataspecer/dataspecer/issues/1366
        url ||= store.getObjects(profileOfSubject.id, PROF.hasArtifact, null)[0]?.id

        const specification: ExternalSpecification = {
          url: url!,
        };

        if (profileOfSubject.termType === "NamedNode") {
          specification.iri = profileOfSubject.value;
        }

        const name = store.getObjects(profileOfSubject, DCT_TITLE, null);
        if (name.length > 0) {
          specification.title = quadToLanguageString(name);
        }
        const description = store.getObjects(profileOfSubject, DCT_DESCRIPTION, null);
        if (description.length > 0) {
          specification.description = quadToLanguageString(description);
        }

        return specification;
      }),

      resources: store.getObjects(specificationSubject, PROF.hasResource, null).map((resourceSubject) => {
        // For each resource descriptor of the specification

        const roles = store.getObjects(resourceSubject.id, PROF.hasRole, null);
        let foundRole: string = dsvMetadataWellKnown.role.guidance; // Default role
        let allRoles = Object.values(dsvMetadataWellKnown.role);
        for (const role of roles) {
          let iri = role.value;

          // https://github.com/dataspecer/dataspecer/issues/1366
          {
            const badRoleMapping = {
              "http://www.w3.org/ns/dx/prof/role/Guidance": dsvMetadataWellKnown.role.guidance,
              // prof:[S]pecification is actually constraint
              "http://www.w3.org/ns/dx/prof/role/Specification": dsvMetadataWellKnown.role.constraints,
              "http://www.w3.org/ns/dx/prof/role/Vocabulary": dsvMetadataWellKnown.role.vocabulary,
            };
            if (role.value in badRoleMapping) {
              iri = badRoleMapping[role.value as keyof typeof badRoleMapping];
            }
          }

          if (allRoles.includes(iri)) {
            foundRole = iri;
            break;
          }
        }

        const artefactUrl = store.getObjects(resourceSubject.id, PROF.hasArtifact, null)?.[0].id;

        const formats = store.getObjects(resourceSubject.id, DCT_FORMAT, null);
        let foundMime: string | undefined = undefined;
        let fallbackFormat: string | undefined = undefined;
        for (const format of formats) {
          const iri = format.value;
          if (fallbackFormat === undefined) {
            fallbackFormat = iri;
          }
          for (const [mime, mappedIri] of Object.entries(mimeToIriMap)) {
            if (mappedIri === iri && foundMime === undefined) {
              foundMime = mime;
            }
          }
        }

        let types = store.getObjects(resourceSubject.id, RDF_TYPE, null).map((obj) => obj.value);
        // Filter out known types
        types = types.filter((t) => t !== ADMS.AssetDistribution && t !== PROF.ResourceDescriptor);

        return {
          iri: resourceSubject.value,
          url: artefactUrl,

          additionalRdfTypes: types,
          formatMime: foundMime ?? fallbackFormat,
          role: foundRole,

          conformsTo: store.getObjects(resourceSubject.id, DCT_CONFORMS_TO, null).map((obj) => obj.value),
        } satisfies ResourceDescriptor;
      }),
    } satisfies Specification;
  });

  return specifications;
}

/**
 * Parses string containing JSON-LD and returns DSV Metadata model.
 */
export async function JsonLdStringToDSVMetadata(
  jsonLdString: string,
  params: {
    baseIri: string;
  },
): Promise<Specification[]> {
  const jsonLd = await jsonld.expand(JSON.parse(jsonLdString), {
    base: params.baseIri,
  });
  const quads = (await jsonld.toRDF(jsonLd)) as Quad[];

  return rdfToDSVMetadata(quads, { baseIri: params.baseIri });
}

function quadToLanguageString(literal: Quad_Object[]): LanguageString {
  const result: LanguageString = {};
  if (literal) {
    for (const entry of literal) {
      if (entry.termType === "Literal" && entry.language) {
        result[entry.language] = entry.value;
      }
    }
  }
  return result;
}
