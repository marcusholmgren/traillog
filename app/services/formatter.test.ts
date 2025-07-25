import { describe, it, expect, vi } from "vitest";
import { coordinateFormat, numberFormat, dateFormatter } from "./formatter";

// Mock navigator for locale-dependent tests
const mockNavigator = (locales = ["en-US"]) => {
  Object.defineProperty(global, "navigator", {
    value: { languages: locales, language: locales[0] },
    configurable: true,
  });
};

describe("coordinateFormat", () => {
  it("formats positive coordinates with 3-4 decimals", () => {
    expect(coordinateFormat(59.123456)).toBe("59.1235");
    expect(coordinateFormat(18.123)).toBe("18.123");
  });

  it("formats negative coordinates", () => {
    expect(coordinateFormat(-12.98765)).toBe("-12.9877");
  });

  it("formats integer coordinates", () => {
    expect(coordinateFormat(42)).toBe("42.000");
  });
});

describe("numberFormat", () => {
  beforeEach(() => mockNavigator(["en-US"]));

  it("formats meters with one decimal and unit", () => {
    expect(numberFormat(123)).toMatch(/123\.0 ?m/);
    expect(numberFormat(0)).toMatch(/0\.0 ?m/);
  });

  it("formats bigints", () => {
    expect(numberFormat(BigInt(1000))).toMatch(/1,000\.0?m/);
  });
});

describe("dateFormatter", () => {
  beforeEach(() => mockNavigator(["en-US"]));

  it("formats Date objects", () => {
    const date = new Date("2024-06-01T12:34:00Z");
    expect(dateFormatter(date)).toMatch(/\d{4}/); // Year should be present
  });

  it("formats timestamps", () => {
    const timestamp = Date.UTC(2024, 5, 1, 12, 34, 0);
    expect(dateFormatter(timestamp)).toMatch(/\d{4}/);
  });
});
