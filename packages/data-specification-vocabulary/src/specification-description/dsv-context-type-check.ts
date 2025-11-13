/**
 * This file checks that the dsv-context.json file conforms to the expected structure.
 */

import context from "./dsv-context.json" with { type: "json" };
import type { DSV_METADATA_SCHEMA_ID, DSV_METADATA_SCHEMA_TYPE, DSVMetadataExternalSpecification, DSVMetadataResourceDescriptor, DSVMetadataSchemaRoot, DSVMetadataSpecification } from "./schema.ts";
import type { knownPrefixes } from "./vocabulary.ts";

type PickOptional<T, K> = {
  [P in K & keyof T]?: T[P];
} & {
  [P in Exclude<keyof T, K>]: T[P];
};

// ROOT

type allowedRootKeys =
  `@${string}` |
  keyof typeof knownPrefixes |
  keyof Omit<DSVMetadataSchemaRoot, typeof DSV_METADATA_SCHEMA_ID | typeof DSV_METADATA_SCHEMA_TYPE | "@context">;

context["@context"] satisfies Record<allowedRootKeys, any>;

// ROOT -> inSpecificationOf

type allowedSchemaKeys =
  `@${string}` |
  keyof Omit<DSVMetadataSpecification, typeof DSV_METADATA_SCHEMA_ID | typeof DSV_METADATA_SCHEMA_TYPE>;

context["@context"].inSpecificationOf["@context"] satisfies PickOptional<Record<allowedSchemaKeys, any>, allowedRootKeys>;

// ROOT -> inSpecificationOf -> hasResource

type allowedExternalSpecificationKeys =
  `@${string}` |
  keyof Omit<DSVMetadataResourceDescriptor, typeof DSV_METADATA_SCHEMA_ID | typeof DSV_METADATA_SCHEMA_TYPE>;

context["@context"].inSpecificationOf["@context"].hasResource["@context"] satisfies PickOptional<Record<allowedExternalSpecificationKeys, any>, allowedSchemaKeys>;

// ROOT -> inSpecificationOf -> isProfileOf

type allowedResourceDescriptorKeys =
  `@${string}` |
  keyof Omit<DSVMetadataExternalSpecification, typeof DSV_METADATA_SCHEMA_ID | typeof DSV_METADATA_SCHEMA_TYPE >;

context["@context"].inSpecificationOf["@context"].isProfileOf["@context"] satisfies PickOptional<Record<allowedResourceDescriptorKeys, any>, allowedSchemaKeys>;
