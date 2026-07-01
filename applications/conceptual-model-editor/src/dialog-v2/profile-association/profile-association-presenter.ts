import {
  createIriInputPresenter,
  createLanguageStringInputPresenter,
  createSelectModelPresenter,
  createSelectPresenter,
  IriInputPresenter,
  LanguageStringInputPresenter,
  SelectModelPresenter,
  SelectEntitiesPresenter,
  createSelectCardinalityPresenter,
  SelectCardinalityPresenter,
  StringInputPresenter,
  createStringInputPresenter,
  SelectEntityPresenter,
  createSelectEntityPresenter,
  createSelectEntitiesPresenter,
  SelectPresenter,
  ProfileValuePresenter,
  createProfileValuePresenter,
} from "../shared";
import { ProfileAssociationState } from "./profile-association-state";

export function useProfileAssociationPresenter(
  setState: (next: (prevState: ProfileAssociationState) => ProfileAssociationState) => void,
): ProfileAssociationPresenter {

  const model = createSelectModelPresenter(next => {
    setState(state => ({ ...state, model: next(state.model) }))
  });

  const iri = createIriInputPresenter(next => {
    setState(state => ({ ...state, iri: next(state.iri) }))
  });

  const name = createProfileValuePresenter((next) => {
    setState(state => ({ ...state, name: next(state.name) }))
  }, createLanguageStringInputPresenter);

  const description = createProfileValuePresenter((next) => {
    setState(state => ({ ...state, description: next(state.description) }))
  }, createLanguageStringInputPresenter);

  const usageNote = createProfileValuePresenter((next) => {
    setState(state => ({ ...state, usageNote: next(state.usageNote) }))
  }, createLanguageStringInputPresenter);

  const profileOf = createSelectEntitiesPresenter((next) => {
    setState(state => ({ ...state, profileOf: next(state.profileOf) }))
  });

  const specializationOf = createSelectEntitiesPresenter((next) => {
    setState(state => ({ ...state, specializationOf: next(state.specializationOf) }))
  });

  const externalDocumentationUrl = createStringInputPresenter((next) => {
    setState(state => ({ ...state, externalDocumentationUrl: next(state.externalDocumentationUrl) }))
  });

  const order = createStringInputPresenter((next) => {
    setState(state => ({ ...state, order: next(state.order) }))
  });

  const mandatoryLevel = createSelectPresenter((next) => {
    setState(state => ({ ...state, mandatoryLevel: next(state.mandatoryLevel) }))
  });

  const domain = createSelectEntityPresenter((next) => {
    setState(state => ({ ...state, domain: next(state.domain) }))
  });

  const domainCardinality = createProfileValuePresenter((next) => {
    setState(state => ({ ...state, domainCardinality: next(state.domainCardinality) }))
  }, createSelectCardinalityPresenter);

  const range = createSelectEntityPresenter((next) => {
    setState(state => ({ ...state, range: next(state.range) }))
  });

  const rangeCardinality = createProfileValuePresenter((next) => {
    setState(state => ({ ...state, rangeCardinality: next(state.rangeCardinality) }))
  }, createSelectCardinalityPresenter);

  return {
    model,
    iri,
    name,
    description,
    usageNote,
    profileOf,
    specializationOf,
    externalDocumentationUrl,
    order,
    mandatoryLevel,
    domain,
    domainCardinality,
    range,
    rangeCardinality,
  }
}

interface ProfileAssociationPresenter {

  model: SelectModelPresenter;

  iri: IriInputPresenter;

  name: ProfileValuePresenter<LanguageStringInputPresenter>;

  description: ProfileValuePresenter<LanguageStringInputPresenter>;

  usageNote: ProfileValuePresenter<LanguageStringInputPresenter>;

  profileOf: SelectEntitiesPresenter;

  specializationOf: SelectEntitiesPresenter;

  externalDocumentationUrl: StringInputPresenter;

  order: StringInputPresenter;

  mandatoryLevel: SelectPresenter;

  domain: SelectEntityPresenter;

  domainCardinality: ProfileValuePresenter<SelectCardinalityPresenter>;

  range: SelectEntityPresenter;

  rangeCardinality: ProfileValuePresenter<SelectCardinalityPresenter>;

}
