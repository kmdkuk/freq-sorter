import { describe, it, expect, beforeEach } from "vitest";
import { InMemoryStorage } from "./index";

describe("InMemoryStorage", () => {
  let storage: InMemoryStorage;

  beforeEach(() => {
    storage = new InMemoryStorage();
  });

  it("should store and retrieve a value", async () => {
    await storage.set({ key: "value" });
    const result = await storage.get<{ key: string }>("key");
    expect(result.key).toBe("value");
  });

  it("should retrieve multiple values", async () => {
    await storage.set({ key1: "value1", key2: "value2" });
    const result = await storage.get<{ key1: string; key2: string }>([
      "key1",
      "key2",
    ]);
    expect(result).toEqual({ key1: "value1", key2: "value2" });
  });

  it("should return all values if keys is null", async () => {
    await storage.set({ key1: "value1", key2: "value2" });
    const result = await storage.get<{ key1: string; key2: string }>(null);
    expect(result).toEqual({ key1: "value1", key2: "value2" });
  });
});
