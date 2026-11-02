import type { LanguageString } from "@dataspecer/core/core";

const PIM_PREFIX = "https://ofn.gov.cz/slovník/pim/";

const PIM = {
  HAS_TECHNICAL_LABEL: PIM_PREFIX + "technicalLabel",
  HAS_INTERPRETATION: PIM_PREFIX + "hasInterpretation",
  HAS_CLASS: PIM_PREFIX + "hasClass",
  HAS_DATA_TYPE: PIM_PREFIX + "hasDatatype",
  HAS_END: PIM_PREFIX + "hasEnd",
  HAS_PARTICIPANT: PIM_PREFIX + "hasParticipant",
  CLASS: PIM_PREFIX + "Class",
  ATTRIBUTE: PIM_PREFIX + "Attribute",
  ASSOCIATION: PIM_PREFIX + "Association",
  ASSOCIATION_END: PIM_PREFIX + "AssociationEnd",
  SCHEMA: PIM_PREFIX + "Schema",
  HAS_ISA: PIM_PREFIX + "isa",
};

export class CoreResource {
  types: string[] = [];
  iri: string | null;

  protected constructor(iri: string | null) {
    this.iri = iri;
  }
}

export class PimSchema extends CoreResource {
  private static readonly TYPE = PIM.SCHEMA;
  pimHumanLabel: LanguageString | null = null;
  pimHumanDescription: LanguageString | null = null;
  pimParts: string[] = [];

  constructor(iri: string | null = null) {
    super(iri);
    this.types.push(PimSchema.TYPE);
  }

  static is(resource: CoreResource | null): resource is PimSchema {
    return !!resource?.types.includes(PimSchema.TYPE);
  }
}

export class PimResource extends CoreResource {
  pimInterpretation: string | null = null;
  pimTechnicalLabel: string | null = null;
  pimHumanLabel: LanguageString | null = null;
  pimHumanDescription: LanguageString | null = null;

  protected constructor(iri: string | null) {
    super(iri);
  }
}

export class PimClass extends PimResource {
  static readonly TYPE = PIM.CLASS;
  pimExtends: string[] = [];
  pimIsCodelist = false;
  pimCodelistUrl: string[] = [];
  pimRegex: string | null = null;
  pimExample: string[] | null = null;
  pimObjectExample: object[] | null = null;

  constructor(iri: string | null = null) {
    super(iri);
    this.types.push(PimClass.TYPE);
  }

  static is(resource: CoreResource | null): resource is PimClass {
    return !!resource?.types.includes(PimClass.TYPE);
  }
}

export class PimAttribute extends PimResource {
  static readonly TYPE = PIM.ATTRIBUTE;
  pimDatatype: string | null = null;
  pimLanguageStringRequiredLanguages: string[] = [];
  pimOwnerClass: string | null = null;
  pimCardinalityMin: number | null = null;
  pimCardinalityMax: number | null = null;
  pimRegex: string | null = null;
  pimExample: string[] | null = null;

  constructor(iri: string | null = null) {
    super(iri);
    this.types.push(PimAttribute.TYPE);
  }

  static is(resource: CoreResource | null): resource is PimAttribute {
    return !!resource?.types.includes(PimAttribute.TYPE);
  }
}

export class PimAssociation extends PimResource {
  static readonly TYPE = PIM.ASSOCIATION;
  pimEnd: string[] = [];
  pimIsOriented = false;

  constructor(iri: string | null = null) {
    super(iri);
    this.types.push(PimAssociation.TYPE);
  }

  static is(resource: CoreResource | null): resource is PimAssociation {
    return !!resource?.types.includes(PimAssociation.TYPE);
  }
}

export class PimAssociationEnd extends PimResource {
  private static readonly TYPE = PIM.ASSOCIATION_END;
  pimPart: string | null = null;
  pimCardinalityMin: number | null = null;
  pimCardinalityMax: number | null = null;

  constructor(iri: string | null = null) {
    super(iri);
    this.types.push(PimAssociationEnd.TYPE);
  }

  static is(resource: CoreResource | null): resource is PimAssociationEnd {
    return !!resource?.types.includes(PimAssociationEnd.TYPE);
  }
}
