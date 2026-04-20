import { BaseResource, type PackageService } from "@dataspecer/core-v2/project";
import { LanguageString } from "@dataspecer/core/core/core-resource";
import { BaseModel, BlobModel, ModelRepository, PackageModel, WritableBlobModel } from "@dataspecer/specification/model-repository";

export class FrontendModelRepository implements ModelRepository {
  constructor(protected backendService: PackageService) { }

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

  constructor(protected baseModel: BaseResource, protected modelRepository: PackageService) {
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

export class FrontendBlobModel extends FrontendBaseModel implements BlobModel, WritableBlobModel {
  constructor(baseModel: BaseResource, modelRepository: PackageService) {
    super(baseModel, modelRepository);
  }

  async getJsonBlob(name?: string): Promise<unknown> {
    return await this.modelRepository.getResourceJsonData(this.id, name);
  }

  async setJsonBlob(data: unknown, name?: string): Promise<void> {
    await this.modelRepository.setResourceJsonData(this.id, data, name);
  }
}

export class FrontendPackageModel extends FrontendBlobModel implements PackageModel {
  constructor(baseModel: BaseResource, modelRepository: PackageService) {
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