import { StructureModel} from "@dataspecer/generators/structure-model/model";
import { DataSpecificationArtefact } from "@dataspecer/core/data-specification/model";
import { ShexAdapter } from "../../shex-adapter.ts";
import { ShexMapAdapter } from "../../shex-map-adapter.ts";

class ShapeCreator{

    async createShexShape(sm : StructureModel) : Promise<String> {
        var artefact = new DataSpecificationArtefact();
        const adapter = new ShexAdapter(sm, null, artefact, "https://example.org/");
        const data =  (await adapter.generate()).data;

        return data;
    }

    async createShexMap(sm : StructureModel) : Promise<String> {
        var artefact = new DataSpecificationArtefact();
        const adapter = new ShexMapAdapter(sm, null, artefact, "https://example.org/");
        const data =  (await adapter.generate()).data;

        return data;
    }
}

export default ShapeCreator;