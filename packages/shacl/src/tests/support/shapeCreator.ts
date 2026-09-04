import { StructureModel} from "@dataspecer/generators/structure-model/model";
import { DataSpecificationArtefact } from "@dataspecer/core/data-specification/model";
import { ShaclAdapter } from "../../shacl-adapter.ts";

class ShapeCreator{

    async createShape(sm : StructureModel) : Promise<String> {
        var artefact = new DataSpecificationArtefact();
        artefact.configuration = {publicBaseUrl: 'https://example.org/'};
        const adapter = new ShaclAdapter(sm, null, artefact);
        const data =  (await adapter.generate()).data;

        return data;
    }

}

export default ShapeCreator;