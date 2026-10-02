import { describe, expect, it } from "vitest";
import { localizedPath, negotiateLocale, splitLocale } from "./config";

describe("negotiateLocale", () => {
  it("falls back to English without a header", () => {
    expect(negotiateLocale(null)).toBe("en");
    expect(negotiateLocale("")).toBe("en");
  });

  it("picks Dutch for Dutch browsers, including regional variants", () => {
    expect(negotiateLocale("nl")).toBe("nl");
    expect(negotiateLocale("nl-NL,nl;q=0.9,en;q=0.8")).toBe("nl");
    expect(negotiateLocale("nl-BE")).toBe("nl");
  });

  it("respects q-values rather than order", () => {
    expect(negotiateLocale("en;q=0.5,nl;q=0.9")).toBe("nl");
    expect(negotiateLocale("nl;q=0.2,en;q=0.8")).toBe("en");
  });

  it("ignores unsupported languages and q=0", () => {
    expect(negotiateLocale("de,fr;q=0.9")).toBe("en");
    expect(negotiateLocale("de,nl;q=0.1")).toBe("nl");
    expect(negotiateLocale("nl;q=0,en;q=0.5")).toBe("en");
  });

  it("survives garbage", () => {
    expect(negotiateLocale(";;;,,q=")).toBe("en");
    expect(negotiateLocale("*")).toBe("en");
  });
});

describe("localizedPath / splitLocale", () => {
  it("prefixes paths with the language", () => {
    expect(localizedPath("nl", "/projects")).toBe("/nl/projects");
    expect(localizedPath("en", "/")).toBe("/en");
    expect(localizedPath("en", "contact")).toBe("/en/contact");
  });

  it("splits a prefixed path", () => {
    expect(splitLocale("/nl/projects/x")).toEqual({ lang: "nl", rest: "/projects/x" });
    expect(splitLocale("/en")).toEqual({ lang: "en", rest: "/" });
    expect(splitLocale("/projects")).toEqual({ lang: null, rest: "/projects" });
    expect(splitLocale("/")).toEqual({ lang: null, rest: "/" });
  });
});
