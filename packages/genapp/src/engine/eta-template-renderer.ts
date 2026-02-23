import path from "path";
import { Eta } from "eta";
import { getRelativePath } from "../utils/utils.ts";
import { ImportRelativePath, TemplateModel } from "./templates/template-interfaces.ts";

// simulate __filename and __dirname
import { fileURLToPath } from "url";
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);


function isImportRelativePath(obj: any): obj is ImportRelativePath {
    if (!obj) {
        return false;
    }

    const relPath = (obj as ImportRelativePath);
    return relPath !== undefined
        && relPath.from !== undefined
        && relPath.to !== undefined;
}

export class TemplateGenerator<TTemplate extends TemplateModel> {

    private readonly _eta: Eta;
    constructor() {
        this._eta = new Eta({
            views: path.join(__dirname, "..", "..", "templates"),
            autoTrim: false,
            cache: true
        });
    }

    renderTemplate(template: TTemplate): string {

        if (!template) {
            throw new Error("Invalid template description");
        }

        if (template.placeholders) {
            Object.entries(template.placeholders)
                .forEach(([placeholderName, placeholderValue]) => {
                    if (!isImportRelativePath(placeholderValue)) {
                        return;
                    }

                    const relativePath = getRelativePath(placeholderValue.from, placeholderValue.to);
                    template.placeholders![placeholderName] = `"${relativePath}"`;
                });
        }

        const renderedSourceCode: string = this._eta.render(
            template.templatePath,
            template.placeholders ?? {}
        );

        return renderedSourceCode;
    }
}