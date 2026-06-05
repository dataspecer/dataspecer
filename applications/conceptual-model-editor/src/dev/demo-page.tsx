import { useState } from "react";
import { Qualifier, SelectQualifier } from "../dialog/components/select-qualifier";
import { VocabularyItem } from "../dialog/class-profile/controlled-vocabularies/vocabulary-item";
import { Vocabulary, VocabularyOverride, VocabularyUsage } from "../dialog/class-profile/controlled-vocabularies/vocabulary";
import { AddVocabularyForm } from "../dialog/class-profile/controlled-vocabularies/add-vocabulary-form";
import { SelectControlledVocabularies } from "../dialog/class-profile/controlled-vocabularies/select-controlled-vocabularies";

const SAMPLE_VOCAB: Vocabulary = {
  id: "continents",
  name: "Continents",
  iri: "http://publications.europa.eu/resource/authority/continent",
  regex: "",
  downloadUrl: "",
  docsUrl: "",
};

const AVAILABLE_VOCABULARIES: Vocabulary[] = [
  SAMPLE_VOCAB,
  {
    id: "rivers",
    name: "Rivers",
    iri: "http://publications.europa.eu/resource/authority/river",
    regex: "",
    downloadUrl: "",
    docsUrl: "",
  },
  {
    id: "countries",
    name: "Countries",
    iri: "http://publications.europa.eu/resource/authority/country",
    regex: "",
    downloadUrl: "",
    docsUrl: "",
  },
];

const INHERITED_VOCABULARIES: VocabularyUsage[] = [
  { vocabulary: SAMPLE_VOCAB, qualifier: Qualifier.Recommended },
  { vocabulary: AVAILABLE_VOCABULARIES[1], qualifier: Qualifier.May },
];

export function QualifierTestPage() {
  const [value1, setValue1] = useState<Qualifier | null>(null);

  const [value2, setValue2] = useState<Qualifier | null>(null);
  const [disabled2, setDisabled2] = useState(false);

  const [itemQualifier, setItemQualifier] = useState<Qualifier>(Qualifier.Must);
  const [itemOverrideEnabled, setItemOverrideEnabled] = useState(false);

  const [overrides, setOverrides] = useState<VocabularyOverride[]>([]);
  const [added, setAdded] = useState<VocabularyUsage[]>([]);
  const [isValid, setIsValid] = useState(true);

  return (
    <div className="p-8 flex flex-col gap-8">
      <h1 className="text-xl font-bold">Component demo</h1>

      <section className="flex flex-col gap-2">
        <h2 className="font-semibold">Without inherited</h2>
        <SelectQualifier value={value1} onChange={setValue1} />
        <p className="text-sm text-gray-500">Selected: {value1 ?? "none"}</p>
      </section>

      <section className="flex flex-col gap-2">
        <h2 className="font-semibold">With inherited = RECOMMENDED</h2>
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={disabled2}
            onChange={e => setDisabled2(e.target.checked)}
          />
          Disabled
        </label>
        <SelectQualifier
          value={value2}
          inherited={Qualifier.Recommended}
          disabled={disabled2}
          onChange={setValue2}
        />
        <p className="text-sm text-gray-500">Selected: {value2 ?? "none"}</p>
      </section>

      <section className="flex flex-col gap-2">
        <h2 className="font-semibold">VocabularyItem — "In this profile" (no inherited)</h2>
        <VocabularyItem
          vocabulary={SAMPLE_VOCAB}
          qualifier={itemQualifier}
          onQualifierChange={setItemQualifier}
          onRemove={() => alert("Remove clicked")}
        />
      </section>

      <section className="flex flex-col gap-2">
        <h2 className="font-semibold">VocabularyItem — "From profiled" (inherited = RECOMMENDED)</h2>
        <VocabularyItem
          vocabulary={SAMPLE_VOCAB}
          qualifier={Qualifier.Recommended}
          inherited={Qualifier.Recommended}
          overrideEnabled={itemOverrideEnabled}
          onQualifierChange={setItemQualifier}
          onOverrideToggle={() => setItemOverrideEnabled(v => !v)}
        />
      </section>

      <section className="flex flex-col gap-2">
        <h2 className="font-semibold">SelectControlledVocabularies</h2>
        <p className="text-sm text-gray-500">Valid: {isValid ? "yes" : "no"}</p>
        <SelectControlledVocabularies
          inherited={INHERITED_VOCABULARIES}
          overrides={overrides}
          added={added}
          availableVocabularies={AVAILABLE_VOCABULARIES}
          onOverridesChange={setOverrides}
          onAddedChange={setAdded}
          onValidityChange={setIsValid}
        />
      </section>
    </div>
  );
}
