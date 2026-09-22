import { DatabaseSync } from "node:sqlite";
import { expect, it } from "vitest";
import { createDatabase } from "./database.ts";
import { migrateDatabase } from "../migration-utils/migrate-database.ts";
import { InMemoryStoreModel } from "../models/in-memory-store-model.ts";
import { ResourceModel } from "../models/resource-model.ts";

it("uses the migrated in-memory database for resource and document operations", async () => {
  const connection = new DatabaseSync(":memory:");
  const database = createDatabase(connection);
  try {
    await migrateDatabase(connection);
    const resources = new ResourceModel(new InMemoryStoreModel(), database);
    await resources.createPackage(null, "urn:test:root", {});
    expect(await resources.getResourceStoreBuffer("urn:test:root")).toBeNull();
    await resources.setResourceStoreJson("urn:test:root", { label: "Příliš" });
    expect(await resources.getResourceStoreJson("urn:test:root")).toEqual({ label: "Příliš" });
    const buffer = await resources.getResourceStoreBuffer("urn:test:root");
    buffer!.fill(0);
    expect(await resources.getResourceStoreJson("urn:test:root")).toEqual({ label: "Příliš" });
    await resources.setResourceStoreJson("urn:test:root", { label: "Updated" });
    expect(await resources.getResourceStoreJson("urn:test:root")).toEqual({ label: "Updated" });
    await resources.deleteResourceStore("urn:test:root");
    expect(await resources.getResourceStoreBuffer("urn:test:root")).toBeNull();
    await resources.deleteResource("urn:test:root");
    expect(await resources.getRootResources()).toEqual([]);
  } finally {
    await database.destroy();
  }
});
