import { SemanticModelClass, SemanticModelEntity } from "../concepts/concepts.ts";
import { classQuery, classSurroundingsQuery, searchQuery, SearchQueryEntity } from "../async-queryable/queries.ts";
import {
    AsyncQueryableEntityModel,
    AsyncQueryableObservableEntityModel,
} from "../../entity-model/async-queryable/model.ts";
import { Entity } from "../../entity-model/index.ts";
import { EntityModel } from "../../entity-model/entity-model.ts";
import { SimpleAsyncQueryableObservableEntityModel } from "../../entity-model/async-queryable/implementation.ts";
import { QUERYABLE_MODEL } from "../../model/known-models.ts";

export class ExternalSemanticModel implements EntityModel {
    private id: string;
    private model: AsyncQueryableEntityModel;
    private observableModel: AsyncQueryableObservableEntityModel;

    constructor(model: AsyncQueryableEntityModel, observableModel: AsyncQueryableObservableEntityModel, id?: string) {
        this.id = id ?? (Math.random() + 1).toString(36).substring(7);
        this.model = model;
        this.observableModel = observableModel;
    }

    serializeModel() {
        return {
            type: QUERYABLE_MODEL,
            id: this.id,
            queries: Object.keys((this.observableModel as SimpleAsyncQueryableObservableEntityModel).queries),
        };
    }

    async unserializeModel(data: object) {
        const modelDescriptor = data as any;
        this.id = modelDescriptor.id;
        const queries = modelDescriptor.queries as string[];
        for (const query of queries) {
            await this.observableModel.addQuery(query);
        }
    }

    getId(): string {
        return this.id;
    }

    getAlias(): string | null {
        return this.id;
    }

    setAlias(alias: string): void {
        return;
    }

    getEntities(): Record<string, Entity> {
        return this.observableModel.getEntities();
    }
    subscribeToChanges(callback: (updated: Record<string, Entity>, removed: string[]) => void): () => void {
        return this.observableModel.subscribeToChanges(callback);
    }

    /**
     * Searches for a given string and returns a list of classes that were found.
     * @param query search string, may contain regex if supported
     */
    async search(query: string): Promise<SemanticModelClass[]> {
        const iri = searchQuery(query);
        const result = await this.model.query(iri);
        const searchQueryEntity = result[iri] as SearchQueryEntity;
        return searchQueryEntity.order.map<SemanticModelClass>((iri) => result[iri] as SemanticModelClass);
    }

    async allowClass(id: string) {
        const query = classQuery(id);
        await this.observableModel.addQuery(query);
    }

    async releaseClass(id: string) {
        const query = classQuery(id);
        await this.observableModel.releaseQuery(query);
    }

    async getSurroundings(id: string): Promise<SemanticModelEntity[]> {
        const query = classSurroundingsQuery(id);
        const result = await this.model.query(query);
        return Object.values(result) as unknown as SemanticModelEntity[];
    }

    async allowClassSurroundings(id: string) {
        const query = classSurroundingsQuery(id);
        await this.observableModel.addQuery(query);
    }

    async releaseClassSurroundings(id: string) {
        const query = classSurroundingsQuery(id);
        await this.observableModel.releaseQuery(query);
    }

    async getFullHierarchy(id: string): Promise<SemanticModelEntity[]> {
        const query = "hierarchy:" + id;
        return Object.values(await this.model.query(query)) as unknown as SemanticModelEntity[];
    }
}
