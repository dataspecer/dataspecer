import { isVisualNode, VisualNode, WritableVisualModel } from "@dataspecer/core-v2/visual-model";
import { DialogApiContextType } from "../dialog/dialog-service";
import { ClassesContextType } from "../context/classes-context";
import { UseNotificationServiceWriterType } from "../notification/notification-service-context";
import { createEditClassAttributesDialog } from "../dialog/class/edit-node-attributes-dialog";
import { getDomainAndRange } from "../util/relationship-utils";
import { EditNodeAttributesState, AttributeData } from "../dialog/class/edit-node-attributes-dialog-controller";
import { Entity } from "@dataspecer/core-v2";
import { Options } from "../application";
import { Language } from "../configuration/options";
import { isSemanticModelAttribute } from "@dataspecer/core-v2/semantic-model/concepts";
import { isSemanticModelAttributeUsage } from "@dataspecer/core-v2/semantic-model/usage/concepts";
import { getStringFromLanguageStringInLang } from "../util/language-utils";
import { isSemanticModelAttributeProfile } from "../dataspecer/semantic-model";

export function openEditNodeAttributesDialogAction(
  dialogs: DialogApiContextType,
  notifications: UseNotificationServiceWriterType,
  classes: ClassesContextType,
  options: Options,
  visualModel: WritableVisualModel,
  nodeIdentifier: string,
) {
  const node = visualModel.getVisualEntity(nodeIdentifier);
  if(node === null) {
    notifications.error("Node to modify attribute's position on, could not be found");
    return;
  }
  if(!isVisualNode(node)) {
    notifications.error("Node to modify attribute's position on, is not a node");
    return;
  }

  const onConfirm = (state: EditNodeAttributesState) => {
    visualModel.updateVisualEntity(node.identifier, {content: state.visibleAttributes.map(attribute => attribute.identifier)});
  }

  // TODO RadStr: Commented code - if we will want to do something with relationships
  //                               (that is transforming them into attributes and vice versa)
  // const relationships = classes.relationships
  //   .filter(relationship => !node.content.includes(relationship.id) && getDomainAndRange(relationship).domain?.concept === node.representedEntity)
  //   .map(relationship => ({identifier: relationship.id, name: relationship.name[options.language]}));
  const { visibleAttributes, hiddenAttributes } = splitIntoVisibleAndHiddenAttributes(classes.rawEntities, node, options.language);

  dialogs.openDialog(createEditClassAttributesDialog(onConfirm, visibleAttributes, hiddenAttributes, node.representedEntity, options.language));
}

type VisibleAnHiddenAttributes = {
  visibleAttributes: AttributeData[],
  hiddenAttributes: AttributeData[],
};

function splitIntoVisibleAndHiddenAttributes(
  rawEntities: (Entity | null)[],
  node: VisualNode,
  language: Language
): VisibleAnHiddenAttributes {
  const visibleAttributesUnordered: AttributeData[] = [];
  const hiddenAttributes: AttributeData[] = [];
  const defaultName = "Can not find name for attribute";
  rawEntities.forEach(rawEntity => {
    const isVisible = node.content.findIndex(visibleAttribute => visibleAttribute === rawEntity?.id) !== -1;
    let name: string;
    if (isSemanticModelAttribute(rawEntity)) {
      const domainAndRange = getDomainAndRange(rawEntity);
      if(domainAndRange.domain?.concept !== node.representedEntity) {
        return;
      }
      const nameAsLanguageString = domainAndRange.range?.name ?? null;
      name = getStringFromLanguageStringInLang(nameAsLanguageString, language)[0] ?? defaultName;
    }
    else if (isSemanticModelAttributeUsage(rawEntity) || isSemanticModelAttributeProfile(rawEntity)) {
      const domainAndRange = getDomainAndRange(rawEntity);
      if(domainAndRange.domain?.concept !== node.representedEntity) {
        return;
      }
      const nameAsLanguageString = domainAndRange.range?.name ?? null;
      name = getStringFromLanguageStringInLang(nameAsLanguageString, language)[0] ?? defaultName;
    }
    else {
      return null;
    }

    const attribute = {
      identifier: rawEntity.id,
      name,
    };
    if(isVisible) {
      visibleAttributesUnordered.push(attribute);
    }
    else {
      hiddenAttributes.push(attribute);
    }
  });

  const visibleAttributes: AttributeData[] = node.content
    .map(attributeIdentifier => visibleAttributesUnordered.find(attribute => attribute.identifier === attributeIdentifier))
    .filter(attribute => attribute !== undefined);
  return {
    visibleAttributes,
    hiddenAttributes
  };
}
