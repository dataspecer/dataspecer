import { LanguageString } from "@dataspecer/core/core/core-resource";
import { BaseModel, BlobModel, ModelRepository, PackageModel } from "@dataspecer/specification/model-repository";
import { ResourceModel } from "../models/resource-model.ts";
import { BaseResource } from "@dataspecer/git-node";

export class BackendModelRepository implements ModelRepository {
  constructor(private resourceModel: ResourceModel) {}

  async getModelById(id: string) {
    const resource = await this.resourceModel.getResource(id);
    if (!resource) {
      return null;
    }
    return new BackendBaseModel(resource, this.resourceModel);
  }
}

export class BackendBaseModel implements BaseModel {
  readonly id: string;
  readonly types: string[];

  constructor(protected baseResource: BaseResource, protected resourceModel: ResourceModel) {
    this.id = baseResource.iri;
    this.types = baseResource.types;
  }

  getUserMetadata(): { label: LanguageString } {
    return this.baseResource.userMetadata as any;
  }

  async asBlobModel(): Promise<BlobModel> {
    return new BackendBlobModel(this.baseResource, this.resourceModel);
  }

  async asPackageModel(): Promise<PackageModel> {
    return new BackendPackageModel(this.baseResource, this.resourceModel);
  }
}

export class BackendBlobModel extends BackendBaseModel implements BlobModel {
  constructor(baseResource: BaseResource, resourceModel: ResourceModel) {
    super(baseResource, resourceModel);
  }

  async getJsonBlob(name?: string): Promise<unknown> {
    const store = await this.resourceModel.getResourceModelStore(this.id, name);
    return store?.getJson();
  }
}

export class BackendPackageModel extends BackendBlobModel implements PackageModel {
  constructor(baseResource: BaseResource, resourceModel: ResourceModel) {
    super(baseResource, resourceModel);
  }

  async getSubResources(): Promise<BaseModel[]> {
    const pckg = await this.resourceModel.getPackage(this.id);
    if (!pckg) {
      return [];
    }

    return pckg.subResources.map((resource) => new BackendBaseModel(resource, this.resourceModel));
  }
}
