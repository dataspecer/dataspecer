import { StructureEditorBackendService } from "@dataspecer/backend-utils/connectors/specification";
import { BaseResource } from "@dataspecer/core-v2/project";
import { LanguageString } from "@dataspecer/core/core/core-resource";
import { BaseModel, BlobModel, ModelRepository, PackageModel } from "@dataspecer/specification/model-repository";

export class FrontendModelRepository implements ModelRepository {
  constructor(protected backendService: StructureEditorBackendService) { }

  async getModelById(modelId: string): Promise<BaseModel | null> {
    const resource = await this.backendService.getResource(modelId);
    if (resource) {
      return new FrontendBaseModel(resource, this.backendService);
    } else {
      return null;
    }
  }
}

export class FrontendBaseModel implements BaseModel {
  readonly id: string;
  readonly types: string[];

  constructor(protected baseModel: BaseResource, protected modelRepository: StructureEditorBackendService) {
    this.id = baseModel.iri;
    this.types = baseModel.types;
  }

  getUserMetadata(): { label: LanguageString; } {
    return this.baseModel.userMetadata as { label: LanguageString; };
  }

  async asBlobModel(): Promise<BlobModel> {
    return new FrontendBlobModel(this.baseModel, this.modelRepository);
  }

  async asPackageModel(): Promise<PackageModel> {
    return new FrontendPackageModel(this.baseModel, this.modelRepository);
  }
}

export class FrontendBlobModel extends FrontendBaseModel implements BlobModel {
  constructor(baseModel: BaseResource, modelRepository: StructureEditorBackendService) {
    super(baseModel, modelRepository);
  }

  async getJsonBlob(name?: string): Promise<unknown> {
    return await this.modelRepository.getResourceJsonData(this.id, name);
  }
}

export class FrontendPackageModel extends FrontendBlobModel implements PackageModel {
  constructor(baseModel: BaseResource, modelRepository: StructureEditorBackendService) {
    super(baseModel, modelRepository);
  }

  async getSubResources(): Promise<BaseModel[]> {
    const pckg = await this.modelRepository.getPackage(this.id);
    if (!pckg) {
      return [];
    }
    return pckg.subResources!.map(resource => new FrontendBaseModel(resource, this.modelRepository));
  }
}