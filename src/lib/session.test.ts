import { describe, expect, it, beforeAll } from "vitest";
import { issueToken, verifyToken } from "./session";

beforeAll(() => {
  process.env.SESSION_SECRET = "test-secret-do-not-use-in-prod";
});

describe("issueToken / verifyToken", () => {
  it("round-trips valid data", () => {
    const token = issueToken("test", { userId: "abc" }, 60);
    const data = verifyToken(token, "test");
    expect(data).toEqual({ userId: "abc" });
  });

  it("rejects a token verified against the wrong purpose", () => {
    const token = issueToken("purpose-a", { userId: "abc" }, 60);
    expect(verifyToken(token, "purpose-b")).toBeNull();
  });

  it("rejects an expired token", () => {
    const token = issueToken("test", { userId: "abc" }, -1);
    expect(verifyToken(token, "test")).toBeNull();
  });

  it("rejects a tampered payload", () => {
    const token = issueToken("test", { userId: "abc" }, 60);
    const [, signature] = token.split(".");
    const tamperedPayload = Buffer.from(JSON.stringify({ purpose: "test", data: { userId: "evil" }, exp: Date.now() + 60000 })).toString("base64url");
    expect(verifyToken(`${tamperedPayload}.${signature}`, "test")).toBeNull();
  });

  it("rejects a missing token", () => {
    expect(verifyToken(undefined, "test")).toBeNull();
    expect(verifyToken(null, "test")).toBeNull();
  });

  it("rejects a malformed token", () => {
    expect(verifyToken("not-a-real-token", "test")).toBeNull();
  });
});
