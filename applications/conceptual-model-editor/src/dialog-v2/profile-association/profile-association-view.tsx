import { useMemo } from "react";
import { DialogProperties } from "../dialog-presenter-api";
import {
  SelectModel,
  LanguageStringInput,
  IriInput,
  SelectCardinality,
  SelectEntity,
  StringInput,
  Select,
  SelectEntities,
  ProfileValue,
} from "../shared";
import { useProfileAssociationPresenter } from "./profile-association-presenter";
import { ProfileAssociationState } from "./profile-association-state";

export const ProfileAssociationView = (
  props: DialogProperties<ProfileAssociationState>,
) => {
  const presenter = useMemo(
    () => useProfileAssociationPresenter(props.setState),
    [props.setState]);
  const state = props.state;
  return (
    <div>
      Model:
      <SelectModel
        state={state.model}
        placeholder="Select a model"
        presenter={presenter.model}
      />
      <br />
      Profile of:
      <SelectEntities
        state={state.profileOf}
        placeholder="Select entities to profile"
        presenter={presenter.profileOf}
      />
      <br />
      Name:
      <ProfileValue
        state={state.name}
        presenter={presenter.name}
      >
        <LanguageStringInput
          state={state.name.value}
          placeholder="Name your property"
          presenter={presenter.name.wrapped}
          disabled={state.name.wrappedDisabled}
        />
      </ProfileValue>
      <br />
      Domain:
      <SelectEntity
        state={state.domain}
        placeholder="Select domain"
        presenter={presenter.domain}
      />
      <br />
      IRI:
      <IriInput
        state={state.iri}
        presenter={presenter.iri}
      />
      <br />
      Specialization of:
      <SelectEntities
        state={state.specializationOf}
        placeholder="Select entities to specialize"
        presenter={presenter.specializationOf}
      />
      <br />
      Description:
      <ProfileValue
        state={state.description}
        presenter={presenter.description}
      >
        <LanguageStringInput
          state={state.description.wrapped}
          placeholder="Describe your property"
          presenter={presenter.description.wrapped}
          disabled={state.description.wrappedDisabled}
        />
      </ProfileValue>
      <br />
      Usage note:
      <ProfileValue
        state={state.usageNote}
        presenter={presenter.usageNote}
      >
        <LanguageStringInput
          state={state.usageNote.wrapped}
          placeholder="Describe usage"
          presenter={presenter.usageNote.wrapped}
          disabled={state.usageNote.wrappedDisabled}
        />
      </ProfileValue>
      <br />
      Domain cardinality:
      <ProfileValue
        state={state.domainCardinality}
        presenter={presenter.domainCardinality}
      >
        <SelectCardinality
          state={state.domainCardinality.wrapped}
          presenter={presenter.domainCardinality.wrapped}
          disabled={state.domainCardinality.wrappedDisabled}
        />
      </ProfileValue>
      <br />
      Range:
      <SelectEntity
        state={state.range}
        placeholder="Select range"
        presenter={presenter.range}
      />
      <br />
      Range cardinality:
      <ProfileValue
        state={state.rangeCardinality}
        presenter={presenter.rangeCardinality}
      >
        <SelectCardinality
          state={state.rangeCardinality.wrapped}
          presenter={presenter.rangeCardinality.wrapped}
          disabled={state.rangeCardinality.wrappedDisabled}
        />
      </ProfileValue>
      <br />
      External documentation:
      <StringInput
        state={state.externalDocumentationUrl}
        presenter={presenter.externalDocumentationUrl}
        placeholder="Enter URL of the external documentation"
      />
      <br />
      Order:
      <StringInput
        state={state.order}
        presenter={presenter.order}
        placeholder="Order in the data specification"
      />
      <br />
      Mandatory level:
      <Select
        state={state.mandatoryLevel}
        presenter={presenter.mandatoryLevel}
        placeholder="Select mandatory level"
      />
    </div>
  )
}
