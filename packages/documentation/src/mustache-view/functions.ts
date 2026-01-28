import { pathRelative } from "@dataspecer/core/core/utilities/path-relative";
import { PackageContext } from "./views.ts";
import { OFN_LABELS } from "@dataspecer/core/well-known";

/**
 * Basic functions that can be used anywhere
 */
export function prepareFunctions(
    view: object,
    context: PackageContext,
) {
    return {
        ...view,
        relativePath: function (...args: unknown[]) {
            if (args.length === 2) {
                return pathRelative(context.artefact.publicUrl, args[0] as string);
            } else {
                return pathRelative(context.artefact.publicUrl, this);
            }
        },
        sanitizeLink: function () {
            // remove diacritics
            return this.normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/ /g, "-").toLowerCase();
        },
        cardinalityRange: function () {
            return `${this.cardinalityMin ?? 0} - ${this.cardinalityMax ?? "∞"}`;
        },
        cardinalityIsRequired: function () {
            return this.cardinalityMin && this.cardinalityMin > 0;
        },
        getLabelForDataType: function (dataType: string) {
            return OFN_LABELS[dataType] ?? dataType;
        }
    }
}