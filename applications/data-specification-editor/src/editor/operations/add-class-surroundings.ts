import { isSemanticModelRelationPrimitive, SemanticModelClass, SemanticModelRelationship } from "@dataspecer/core-v2/semantic-model/concepts";
import { DataPsmClass } from "@dataspecer/core/data-psm/model";
import { DataPsmCreateAssociationEnd, DataPsmCreateAttribute, DataPsmCreateClass } from "@dataspecer/core/data-psm/operation";
import { ComplexOperation } from "@dataspecer/federated-observable-store/complex-operation";
import { FederatedObservableStore } from "@dataspecer/federated-observable-store/federated-observable-store";
import { SemanticModelAggregator } from "@dataspecer/core-v2/hierarchical-semantic-aggregator";
import { TechnicalLabelOperationContext } from "./context/technical-label-operation-context";

/**
 * true - the resource is a range, false - the resource is a domain
 * Represents an orientation of the association which will be added to the resource. Because the associations may link
 * the resource with itself, we need to distinguish this two types of association.
 */
export type AssociationOrientation = boolean;

/**
 * With each association, the direction of the association must be specified. Suppose we have class Person representing
 * human beings. We also have class Barber, which clearly is a Person. Between Person and Barber, there is an
 * association that Person has a Barber. Because Barber can also have a Barber, the orientation of the association need
 * to be specified, whether we want to join Barber's Barber, or all Barbers going to the Barber.
 *
 * @todo Associations and attributes that belongs to inherited class (not the source class itself) are linked to the
 *     source class. Therefore all the inheritance is flattened.
 */
export class AddClassSurroundings implements ComplexOperation {
  private readonly forDataPsmClass: DataPsmClass;
  private readonly resourcesToAdd: [string, AssociationOrientation][];
  private store!: FederatedObservableStore;
  private context: TechnicalLabelOperationContext | null = null;
  private semanticStore!: SemanticModelAggregator;

  /**
   * @param forDataPsmClass
   * @param resourcesToAdd true - the edge is outgoing (from source to this resource)
   */
  constructor(forDataPsmClass: DataPsmClass, resourcesToAdd: [string, boolean][]) {
    this.forDataPsmClass = forDataPsmClass;
    this.resourcesToAdd = resourcesToAdd;
  }

  setStore(store: FederatedObservableStore) {
    this.store = store;
  }

  setSemanticStore(semanticStore: SemanticModelAggregator) {
    this.semanticStore = semanticStore;
  }

  setContext(context: TechnicalLabelOperationContext) {
    this.context = context;
  }

  execute(): void {
    const dataPsmSchema = this.store.getSchemaForResource(this.forDataPsmClass.iri as string) as string;

    // true means that the second end (with index 1) is used - true is more "natural" in the sense of the association
    // todo: There should be no specific difference between an attribute and association.
    for (const [semanticRelationshipId, orientation] of this.resourcesToAdd) {
      const relationship = this.semanticStore.getLocalEntity(semanticRelationshipId).aggregatedEntity as SemanticModelRelationship;
      if (isSemanticModelRelationPrimitive(relationship)) {
        console.assert(orientation, `Attribute ${semanticRelationshipId} should not have a reverse orientation.`);
        this.processAttribute(relationship, dataPsmSchema);
      } else {
        this.processAssociation(relationship, orientation, dataPsmSchema);
      }
    }
  }

  private processAttribute(attribute: SemanticModelRelationship, dataPsmSchema: string) {
    const dataPsmCreateAttribute = new DataPsmCreateAttribute();
    dataPsmCreateAttribute.dataPsmInterpretation = attribute.id;
    dataPsmCreateAttribute.dataPsmOwner = this.forDataPsmClass.iri ?? null;
    dataPsmCreateAttribute.dataPsmTechnicalLabel = this.context?.getTechnicalLabelFromPim(attribute.ends[1].name) ?? null;
    dataPsmCreateAttribute.dataPsmDatatype = attribute.ends[1].concept ?? null;
    this.store.applyOperation(dataPsmSchema, dataPsmCreateAttribute);
  }

  private processAssociation(
    association: SemanticModelRelationship,
    orientation: AssociationOrientation, // true if outgoing
    dataPsmSchema: string
  ) {
    const targetClass = this.semanticStore.getLocalEntity(association.ends[orientation ? 1 : 0].concept).aggregatedEntity as SemanticModelClass;

    // Data PSM target class

    const dataPsmCreateClass = new DataPsmCreateClass();
    dataPsmCreateClass.dataPsmInterpretation = targetClass.id;
    dataPsmCreateClass.dataPsmTechnicalLabel = this.context?.getTechnicalLabelFromPim(targetClass.name) ?? null;
    const dataPsmCreateClassResult = this.store.applyOperation(dataPsmSchema, dataPsmCreateClass);
    const psmEndRefersToIri = dataPsmCreateClassResult.created[0];

    // Data PSM association end

    const dataPsmCreateAssociationEnd = new DataPsmCreateAssociationEnd();
    dataPsmCreateAssociationEnd.dataPsmInterpretation = association.id;
    dataPsmCreateAssociationEnd.dataPsmPart = psmEndRefersToIri;
    dataPsmCreateAssociationEnd.dataPsmIsReverse = !orientation;
    dataPsmCreateAssociationEnd.dataPsmOwner = this.forDataPsmClass.iri ?? null;
    dataPsmCreateAssociationEnd.dataPsmTechnicalLabel = this.context?.getTechnicalLabelFromPim(association.ends[1].name) ?? null;
    this.store.applyOperation(dataPsmSchema, dataPsmCreateAssociationEnd);
  }
}
