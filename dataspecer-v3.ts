
namespace demo_cme {

  async function main() {
    const backend = backend_api_http.connectToDataSpecerHttpV3(
      "https://tool.dataspecer.com/api");

    const identifier = "33f81baa-0aa5-4a6a-b5b4-30df43667d09";

    // I can use this to show some basic information to the user.
    const specification = await backend.getSpecification(identifier);

    const connection = await backend.connectToSpecificationV3(identifier);

    const labelListener = display_label.createDisplayLabel({
      onEntitiesDidChange(event) {
        /* Here I can just read the label entities
           I can then do what I like with the entities.
           For example I can store them in a map.
         */
      },
    })

    // Listen to changes, i.e. reading state.
    const unsubscribe = connection.subscribeToEntityChanges({
      onEntitiesDidChange(event) {
        /* This is where I can listen to changes. */
        labelListener.onEntitiesDidChange(event);
      },
    }, {
      whitelistModelTypes: [
        project_model.ProjectModelType,
        semantic_vocabulary_model.SemanticVocabularyModelType,
        semantic_profile_model.SemanticProfileModelType,
      ],
    });

    // Create a new class.
    connection.applyOperations([{
      identifier: "0000",
      type: "create-semantic-class-operation-v3",
      title: { cs: "Třída" }
    } as semantic_vocabulary_model.CreateSemanticClassOperation]);

    // Undo operation and wait for it.
    await connection.undoOperation().confirmation;
  }
}

namespace demo_manager {

  async function main() {
    const backend = backend_api_http.connectToDataSpecerHttpV3(
      "https://tool.dataspecer.com/api");
    // Yep, only pooling for specifications.
    // But nothing prevents us to define another model for it ...
    const specifications = await backend.listSpecifications();
  }

}

/**
 * This is API that clients should use to work with the backend.
 * It should be as simple as possible.
 */
namespace backend_api {

  export interface DataSpecerApiV3 {

    /**
     * Return information about a single specification.
     */
    getSpecification(
      identifier: SpecificationIdentifier,
    ): Promise<Specification>;

    /**
     * List all specification stored in the backend.
     */
    listSpecifications(): Promise<Specification[]>;

    /**
     * Register listener for the specification.
     * @throwrs If the connection can not be established.
     */
    connectToSpecificationV3(
      specification: SpecificationIdentifier,
    ): Promise<SpecificationConnectionV3>;

  }

  export type SpecificationIdentifier = string;

  /**
   * Correspond to a row in the manager "Data specifications" list.
   */
  export interface Specification {

    identifier: SpecificationIdentifier;

    label: LangString;

    createdAt: Date;

    modifiedAt: Date;

  }

  type LangString = { [language: string]: string };

  /**
   * There are 2 main groups of functions.
   *
   * The first group are listeners to read the information from backend.
   * This may involve history, entities, or information about connection.
   *
   * The second group is to execute operations and deal with history.
   */
  export interface SpecificationConnectionV3 {

    /**
     * Returned promise is reoslved once the lisheter has been called.
     * Call the listener with all entities from matching models.
     *
     * From user perspective this is like {@list subscribeToEntityChanges} with
     * imideate unsubscribe, but the operation can be better optimized.
     *
     * We keep the API same to enable interchangable use of both functions.
     */
    listEntities(
      listener: EntityChangeListener,
      options: {
        /**
         * When set only events from given model types are send.
         * @deprecated Perhaps we do not need this for now.
         */
        whitelistModelTypes?: string[];
      },
    ): Promise<void>;

    /**
     * Subscribe new listeners.
     * The listener recieve all entities in the model as a first update.
     */
    subscribeToEntityChanges(
      listener: EntityChangeListener,
      options: {
        /**
         * When set only events from given model types are send.
         * @deprecated Perhaps we do not need this for now.
         */
        whitelistModelTypes?: string[];
      },
    ): () => void;

    applyOperations: (operations: Operation[]) => TransactionResult;

    /**
     * Provides access to information about history.
     * Later we may add more information.
     */
    subscribeToHistory(
      listener: (event: { state: { canRedo: boolean, canUndo: boolean } }) => void,
    ): () => void;

    /**
     * Save changes to backend.
     * @deprecated
     */
    saveToBackend(): Promise<void>;

    /**
     * Provides information about the connection and backend status.
     * E.g. online / offline ...
     * @deprecated We may not need this.
     */
    subscribeToHealthcheck(
      listener: (event: { state: { /* ... */ } }) => void,
    ): () => void;

  }

  export type ModelIdentifier = string;

  /**
   * We have this as an interface so we can use it elsewhere.
   */
  export interface EntityChangeListener {

    onEntitiesDidChange(event: Record<ModelIdentifier, EntityChange[]>): void

  }

  export interface EntityChange {

    previous: Entity | null;

    next: Entity | null;

  }

  export interface Entity {

    id: EntityIdentifier;

    types: string[];

  }

  export type EntityIdentifier = string;

  export interface Operation {

    identifier: OperationIdentifier;

    type: string;

  }

  export type OperationIdentifier = string;

  /* Undo last non-undo opration executed using the connection. */
  export interface UndoOperation extends Operation {  } 

  /* Redo last undo opration executed using the connection. */
  export interface RedoOperation extends Operation {  }
  
  export interface TransactionResult {

    /**
     * @deprecated Not sure if we need this here.
     */
    id: TransactionIdentifier;

    /**
     * This promise resolves when all changes were executed by backend and
     * all registered listener were notified.
     */
    confirmation: Promise<void>;

  }

  export type TransactionIdentifier = string;

}

/**
 * This is another package which includes and implements {@link backend_api}.
 */
namespace backend_api_http {

  /**
   * Use this to establish a connection to a backend using HTTP.
   */
  export function connectToDataSpecerHttpV3(
    url: string,
  ): backend_api.DataSpecerApiV3 {
    return null as any;
  }

}

namespace project_model {

  export const ProjectModelType = "";

}

namespace semantic_vocabulary_model {

  export const SemanticVocabularyModelType = "";

  export interface CreateSemanticClassOperation extends backend_api.Operation {

    type: "create-semantic-class-operation-v3"

    title: { [language: string]: string };

  }

}

namespace semantic_profile_model {

  export const SemanticProfileModelType = "";

}

/**
 * This contains derived enties.
 * The objective is to share functionality.
 */
namespace display_label {

  /**
   * This returns a listener that listen for changes in entities.
   * It also takes another listener as an argument.
   * This listener is notified about entities created by this class.
   */
  export function createDisplayLabel(
    listener: backend_api.EntityChangeListener,
  ): backend_api.EntityChangeListener {
    return {
      onEntitiesDidChange(event) {
        /* ... */
      },
    }
  }

  export interface EntityLabeleEntity extends backend_api.Entity {

    types: ["display-label-property-v1"];

    /**
     * Label to use for given entity in the user interface.
     */
    label: { [language: string]: string };

    /**
     * For which entity the labels is.
     */
    entity: backend_api.EntityIdentifier;

    /**
     * From which model the entity is.
     */
    model: backend_api.ModelIdentifier;

  }

  export function isEntityLabeleEntity(
    what: backend_api.Entity,
  ): what is EntityLabeleEntity {
    return what.types.includes("display-label-property-v1");
  }

}

/**
 * When it comes to exposing API to external applications, e.g.
 * AI model assistant we can just define a new model.
 *
 * Like {@link display_label} it will just listen to changes and provide
 * access to new kind of entities. A user can then ignore all other entities
 * and read only information they need.
 *
 * In addition, this can be easily wrapped using HTTP and deployed
 * as another applicatino which provide access to this.
 */
namespace ai_assitant_model {

}

/**
 * The same interface as used by {@link display_label} should be usable
 * to generate entities for DSV export.
 *
 * As a result we can easily get live-preview of DSV in a clent application.
 */
namespace semantic_data_specification_vocabulary {

}

