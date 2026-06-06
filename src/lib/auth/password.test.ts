import { describe, it, expect } from "vitest";
import { hashPassword, verifyPassword } from "./password";

describe("password hashing", () => {
  it("verifies a correct password", async () => {
    const hash = await hashPassword("s3cret-pass");
    expect(await verifyPassword("s3cret-pass", hash)).toBe(true);
  });

  it("rejects an incorrect password", async () => {
    const hash = await hashPassword("s3cret-pass");
    expect(await verifyPassword("wrong", hash)).toBe(false);
  });

  it("produces distinct hashes for the same input (salted)", async () => {
    expect(await hashPassword("abc")).not.toBe(await hashPassword("abc"));
  });
});
