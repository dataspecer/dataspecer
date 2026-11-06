import { SgovAdapter } from "./sgov-adapter.ts";
import { httpFetch } from "@dataspecer/core/io/fetch/fetch-nodejs";
import { isSemanticModelClass, isSemanticModelGeneralization, type SemanticModelEntity, type ExtendedSemanticModelClass } from "@dataspecer/core-v2/semantic-model/concepts";
import type { CimAdapter } from "@dataspecer/core-v2/semantic-model/cim-adapter";
import { FetchOptions } from "@dataspecer/core/io/fetch/fetch-api";

let adapter: CimAdapter;

beforeAll(() => {
  adapter = new SgovAdapter("https://slovník.gov.cz/sparql", httpFetch);
});

test(
  "SgovAdapter.search()",
  async () => {
    const query = "řidič";
    const result = await adapter.search(query);
    expect(result.map((cls) => cls.name?.cs)).toContain(
      "Řidičský průkaz České republiky"
    );
  },
  10 * 60 * 1000
);

describe("SgovAdapter.getClass()", () => {
  test(
    "existing class",
    async () => {
      const query = "https://slovník.gov.cz/veřejný-sektor/pojem/fyzická-osoba";
      const cls = (await adapter.getClass(query)).find(isSemanticModelClass) as ExtendedSemanticModelClass;

      expect(cls.name?.en).toBe("Natural Person");
      expect(cls.description?.en).toBe(
        "Natural Person is a human as a legal subject."
      );
    },
    10 * 60 * 1000
  );

  test(
    "non existing class",
    async () => {
      const query = "https://slovník.gov.cz/veřejný-sektor/pojem/křestní-jméno";
      const cls = await adapter.getClass(query);

      expect(cls).toEqual([]);
    },
    10 * 60 * 1000
  );

  test(
    "is codelist",
    async () => {
      const query =
        "https://slovník.gov.cz/legislativní/sbírka/343/2014/pojem/palivo-jako-položka-číselníku";
      const cls = (await adapter.getClass(query)).find(isSemanticModelClass) as ExtendedSemanticModelClass;
      expect(cls.isCodelist).toBeTruthy();
    },
    10 * 60 * 1000
  );

  test(
    "is not codelist",
    async () => {
      const query =
        "https://slovník.gov.cz/legislativní/sbírka/361/2000/pojem/vozidlo";
      const cls = (await adapter.getClass(query)).find(isSemanticModelClass) as ExtendedSemanticModelClass;
      expect(cls.isCodelist).toBeFalsy();
    },
    10 * 60 * 1000
  );
});

describe("SgovAdapter.getSurroundings()", () => {
  const query = "https://slovník.gov.cz/veřejný-sektor/pojem/fyzická-osoba";
  let entities: SemanticModelEntity[];

  beforeAll(async () => {
    entities = await adapter.getSurroundings(query);
  });

  test("inheritance", async () => {
    expect(entities.filter(isSemanticModelGeneralization)
      .filter(entity => entity.child === query).map(entity => entity.parent)).toEqual(
      expect.arrayContaining([
        "https://slovník.gov.cz/veřejný-sektor/pojem/člověk",
        "https://slovník.gov.cz/veřejný-sektor/pojem/subjekt-práva",
      ])
    );
  });

  test("attributes", async () => {
    const resources = entities.map(entity => entity.id);

    expect(resources).toEqual(
      expect.arrayContaining(
        [
          "https://slovník.gov.cz/veřejný-sektor/pojem/příjmení",
          "https://slovník.gov.cz/veřejný-sektor/pojem/křestní-jméno",
        ]
      )
    );
  });

  test.skip("associations", async () => {
    const resources = entities.map(entity => entity.id);

    expect(resources).toEqual(
      expect.arrayContaining(
        [
          "https://slovník.gov.cz/legislativní/sbírka/361/2000/pojem/přestupek",
        ]
      )
    );
  });
});

test("SgovAdapter.getSurroundings() with quotation marks", async () => {
  await expect(
    adapter.getSurroundings(
      "https://slovník.gov.cz/generický/čas/pojem/časová-specifikace"
    )
  ).resolves.not.toThrow();
});

test("SgovAdapter.getFullHierarchy()", async () => {
  const root = "https://slovník.gov.cz/generický/veřejná-místa/pojem/veřejné-místo";
  const hierarchy = await adapter.getFullHierarchy(root);

  const rootClass = hierarchy.filter(isSemanticModelClass).find(entity => entity.iri === root);

  expect(rootClass).toBeDefined();

  const sportoviste = hierarchy.filter(isSemanticModelClass).find(entity => entity.iri ===
    "https://slovník.gov.cz/datový/sportoviště/pojem/sportoviště");

  expect(sportoviste).toBeDefined();
  expect(hierarchy.filter(isSemanticModelGeneralization)).toEqual(expect.arrayContaining([expect.objectContaining({ child: sportoviste.id, parent: rootClass.id })]));

  const prostorovyObjekt = hierarchy.filter(isSemanticModelClass).find(entity => entity.iri ===
    "https://slovník.gov.cz/veřejný-sektor/pojem/prostorový-objekt");
  expect(prostorovyObjekt).toBeDefined();
});

describe("SgovAdapter.getClassGroup()", () => {
  test("uncached", async () => {
    // New instance of the adapter need to be created
    const adapter = new SgovAdapter("https://slovník.gov.cz/sparql", httpFetch);
    const groups = await adapter.getResourceGroup(
      "https://slovník.gov.cz/veřejný-sektor/pojem/fyzická-osoba"
    );
    expect(groups).toContain("https://slovník.gov.cz/veřejný-sektor/glosář");
  });

  test("cached by get class", async () => {
    const fetchContainer = { fetch: httpFetch };
    const proxyFetch = (url: string, fetchOptions: FetchOptions) =>
      fetchContainer.fetch(url, fetchOptions);
    const adapter = new SgovAdapter(
      "https://slovník.gov.cz/sparql",
      proxyFetch
    );

    await adapter.getClass(
      "https://slovník.gov.cz/veřejný-sektor/pojem/fyzická-osoba"
    );

    // @ts-ignore
    fetchContainer.fetch = () => {
      throw new Error("Fetch called.");
    };

    const groups = await adapter.getResourceGroup(
      "https://slovník.gov.cz/veřejný-sektor/pojem/fyzická-osoba"
    );
    expect(groups).toContain("https://slovník.gov.cz/veřejný-sektor/glosář");
  });

  test("cached by search", async () => {
    const fetchContainer = { fetch: httpFetch };
    const proxyFetch = (url: string, fetchOptions: FetchOptions) =>
      fetchContainer.fetch(url, fetchOptions);
    const adapter = new SgovAdapter(
      "https://slovník.gov.cz/sparql",
      proxyFetch
    );

    await adapter.search("řidič");

    // @ts-ignore
    fetchContainer.fetch = () => {
      throw new Error("Fetch called.");
    };

    const groups = await adapter.getResourceGroup(
      "https://slovník.gov.cz/legislativní/sbírka/361/2000/pojem/řidič"
    );
    expect(groups).toContain(
      "https://slovník.gov.cz/legislativní/sbírka/361/2000/glosář"
    );
  });
});
