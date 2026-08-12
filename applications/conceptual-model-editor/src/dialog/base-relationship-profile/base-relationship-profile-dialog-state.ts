import { LanguageString } from "@dataspecer/core/core/core-resource";
import { createLogger } from "../../application";
import { CmeSemanticModel } from "../../dataspecer/cme-model";
import { EntityDsIdentifier } from "../../dataspecer/entity-model";
import { sanitizeDuplicitiesInRepresentativeLabels } from "../../utilities/label";
import { BaseRelationshipDialogState } from "../base-relationship/base-relationship-dialog-state";
import {
  type EntityRepresentative,
  listProfileCardinalities,
  representProfileCardinality,
} from "../utilities/dialog-utilities";
import { validationNoProblem, validationNotEvaluated, ValidationState } from "../utilities/validation-utilities";
import { validateBaseRelationshipDialogState } from "../base-relationship/base-relationship-dialog-validation";
import { CmeRelationshipProfileMandatoryLevel } from "../../dataspecer/cme-model/model";

const LOG = createLogger(import.meta.url);

export type ItemFilter<ItemType> = (items: ItemType[], model: CmeSemanticModel) => ItemType[];

export interface BaseRelationshipProfileDialogState<RangeType>
  extends BaseRelationshipDialogState<RangeType> {

  /**
   * We keep list of all vocabularies, so we can update
   * list of represented entities.
   */
  vocabularies: CmeSemanticModel[];

  // Domain

  /**
   * List of all domains. We use it to generate {@link availableDomains}.
   */
  allDomains: EntityRepresentative[];

  domainValidation: ValidationState;

  // Domain cardinality

  overrideDomainCardinality: boolean;

  domainCardinalityValidation: ValidationState;

  // Range

  /**
   * List of all range. We use it to generate {@link availableRanges}.
   */
  allRanges: RangeType[];

  rangeValidation: ValidationState;

  // Range cardinality

  overrideRangeCardinality: boolean;

  rangeCardinalityValidation: ValidationState;

  // Mandatory level

  availableMandatoryLevels: {

    value: string;

    label: string;

    cme: CmeRelationshipProfileMandatoryLevel | null;

  }[];

  mandatoryLevel: string;

}

const MANDATORY_LEVELS = [{
  value: "undefined",
  label: "relationship-profile.mandatory-level.undefined",
  cme: null,
}, {
  value: "mandatory",
  label: "relationship-profile.mandatory-level.mandatory",
  cme: CmeRelationshipProfileMandatoryLevel.Mandatory,
}, {
  value: "recommended",
  label: "relationship-profile.mandatory-level.recommended",
  cme: CmeRelationshipProfileMandatoryLevel.Recommended,
}, {
  value: "optional",
  label: "relationship-profile.mandatory-level.optional",
  cme: CmeRelationshipProfileMandatoryLevel.Optional
}];

export function createBaseRelationshipProfileDialogState<RangeType extends {
  identifier: string,
  iri: string | null,
  label: LanguageString,
  model: string,
}>(
  model: CmeSemanticModel,
  vocabularies: CmeSemanticModel[],
  domainIdentifier: EntityDsIdentifier,
  domainCardinality: [number, number | null] | null,
  allDomains: EntityRepresentative[],
  domainFilter: ItemFilter<EntityRepresentative>,
  invalidDomain: EntityRepresentative,
  rangeIdentifier: EntityDsIdentifier,
  rangeCardinality: [number, number | null] | null,
  allRanges: RangeType[],
  rangeFilter: ItemFilter<RangeType>,
  invalidRange: RangeType,
  tags: string[],
): BaseRelationshipProfileDialogState<RangeType> {

  // Filter domains for given model.
  const availableDomains = domainFilter(allDomains, model);

  // Domain
  let domain = availableDomains.find(
    item => item.identifier === domainIdentifier);
  if (domain === undefined) {
    LOG.warn("Can not find domain representative.",
      { domain: domainIdentifier, availableDomains, allDomains });
    domain = invalidDomain;
    availableDomains.push(invalidDomain);
  }

  // Filter ranges for given model.
  const availableRanges = rangeFilter(allRanges, model);

  // Range
  let range = availableRanges.find(
    item => item.identifier === rangeIdentifier);
  if (range === undefined) {
    LOG.warn("Can not find range representative.",
      { range: rangeIdentifier, availableRanges, allRanges });
    range = invalidRange;
    availableRanges.push(invalidRange);
  }

  return validateBaseRelationshipDialogState({
    vocabularies,
    // Domain
    domain,
    invalidDomain,
    allDomains,
    domainValidation: validationNotEvaluated(),
    availableDomains: sanitizeDuplicitiesInRepresentativeLabels(
      vocabularies, availableDomains),
    // Domain cardinality
    domainCardinality: representProfileCardinality(domainCardinality),
    overrideDomainCardinality: domainCardinality !== null,
    domainCardinalityValidation: validationNoProblem(),
    // Range
    range,
    invalidRange,
    rangeValidation: validationNotEvaluated(),
    allRanges,
    availableRanges: sanitizeDuplicitiesInRepresentativeLabels(
      vocabularies, availableRanges),
    // Range cardinality
    rangeCardinality: representProfileCardinality(rangeCardinality),
    overrideRangeCardinality: rangeCardinality !== null,
    rangeCardinalityValidation: validationNoProblem(),
    //
    availableCardinalities: listProfileCardinalities(),
    // Mandatory level
    availableMandatoryLevels: MANDATORY_LEVELS,
    mandatoryLevel: MANDATORY_LEVELS.find(item => tags.includes(item.cme ?? ""))?.value
      ?? MANDATORY_LEVELS[0].value,
  });
}
