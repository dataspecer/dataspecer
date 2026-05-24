import { DataSpecification } from "../data-specification/model/index.ts";
import { assertFailed, assertNot, CoreResourceReader } from "../core/index.ts";
import { StreamDictionary } from "../io/stream/stream-dictionary.ts";
import { ArtefactGenerator } from "./artefact-generator.ts";
import {
  ArtefactGeneratorContext,
  StructureClassLocation,
} from "./artefact-generator-context.ts";
import { coreResourcesToConceptualModel } from "../conceptual-model/index.ts";
import {
  StructureModel,
} from "../structure-model/model/index.ts";
import {coreResourcesToStructuralModel} from "../structure-model/index.ts";

export class Generator {
  private readonly specifications: { [iri: string]: DataSpecification } = {};

  private readonly generators: { [iri: string]: ArtefactGenerator } = {};

  private readonly reader: CoreResourceReader;

  constructor(
    specifications: DataSpecification[],
    reader: CoreResourceReader,
    generators: ArtefactGenerator[] = []
  ) {
    for (const specification of specifications) {
      this.specifications[specification.iri] = specification;
    }
    this.reader = reader;
    for (const generator of generators) {
      this.generators[generator.identifier()] = generator;
    }
  }

  public async generate(
    specificationIri: string,
    output: StreamDictionary
  ): Promise<void> {
    const specification = this.specifications[specificationIri];
    assertNot(
      specification == undefined,
      `Missing specification ${specificationIri}`
    );
    const context = await this.createContext();
    for (const artefact of specification.artefacts) {
      const generator = this.generators[artefact.generator];
      assertNot(
        generator == undefined,
        `Missing generator ${artefact.generator}`
      );
      await generator.generateToStream(
        context,
        artefact,
        specification,
        output
      );
    }
  }

  public async generateArtefact(
    specificationIri: string,
    artefactIri: string,
    output: StreamDictionary
  ): Promise<void> {
    const specification = this.specifications[specificationIri];
    assertNot(
      specification == undefined,
      `Missing specification ${specificationIri}`
    );
    const context = await this.createContext();
    const artefact = specification.artefacts.find((a) => a.iri === artefactIri);
    assertNot(
      artefact === undefined,
      `Artefact ${artefactIri} not found in specification ${specificationIri}`
    );
    const generator = this.generators[artefact.generator];
    assertNot(
      generator == undefined,
      `Missing generator ${artefact.generator}`
    );
    await generator.generateToStream(context, artefact, specification, output);
  }

  public async createContext(): Promise<ArtefactGeneratorContext> {
    const conceptualModels = {};
    const structureModels = {};
    for (const specification of Object.values(this.specifications)) {
      const conceptualModel = coreResourcesToConceptualModel(
        this.reader,
        specification.pim
      );
      assertNot(
        conceptualModel === null,
        `Can't load conceptual model '${specification.pim}'.`
      );
      conceptualModels[specification.pim] = conceptualModel;

      for (const iri of specification.psms) {
        const structureModel = coreResourcesToStructuralModel(
          this.reader,
          iri
        );
        structureModels[iri] = structureModel;
      }
    }

    const createGenerator = (iri) =>
      Promise.resolve(this.generators[iri] ?? null);

    const findStructureClass = (iri) =>
      this.findStructureClass(structureModels, iri);

    return {
      reader: this.reader,
      specifications: this.specifications,
      conceptualModels: conceptualModels,
      structureModels: structureModels,
      createGenerator: createGenerator,
      findStructureClass: findStructureClass,
    };
  }

  private findStructureClass(
    structureModels: { [iri: string]: StructureModel },
    iri: string
  ): StructureClassLocation | null {
    const structureModel = findStructureClassModel(structureModels, iri);
    if (structureModel === null) {
      return null;
    }
    for (const specification of Object.values(this.specifications)) {
      if (specification.psms.includes(structureModel.psmIri)) {
        return {
          structureModel: structureModel,
          specification: specification,
        };
      }
    }
    assertFailed(
      `Missing specification for structure model '${structureModel.psmIri}'.`
    );
  }
}

function findStructureClassModel(
  structureModels: { [iri: string]: StructureModel },
  iri: string
): StructureModel | null {
  for (const structureModel of Object.values(structureModels)) {
    const found = structureModel.getClasses().find(cls => cls.psmIri === iri)
    if (found) {
      return structureModel;
    }
  }
  return null;
}
