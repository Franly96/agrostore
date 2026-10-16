import { beforeEach, describe, expect, it, vi } from "vitest";

const HOST = "store123.public.blob.vercel-storage.com";
const stored = vi.hoisted(() => new Map<string, { contentType: string }>());

vi.mock("server-only", () => ({}));
vi.mock("@vercel/blob", () => {
  class BlobNotFoundError extends Error {}
  return {
    BlobNotFoundError,
    del: vi.fn(),
    head: vi.fn(async (pathname: string) => {
      const file = stored.get(pathname);
      if (!file) throw new BlobNotFoundError();
      return { pathname, contentType: file.contentType, url: `https://${HOST}/${pathname}` };
    }),
  };
});

const { verifyUpload, verifyUploads } = await import("./blob-store");
const { isOwnPathname } = await import("./paths");
const own = (p: string) => isOwnPathname(p, 7);
const file = (pathname: string, host = HOST) => ({ pathname, url: `https://${host}/${pathname}` });

beforeEach(() => {
  stored.clear();
  stored.set("products/7/a.webp", { contentType: "image/webp" });
  stored.set("products/7/b.jpg", { contentType: "image/jpeg" });
  stored.set("products/7/c.html", { contentType: "text/html" });
  stored.set("products/8/x.webp", { contentType: "image/webp" });
});

describe("verifyUpload", () => {
  it("accepts the seller's own image in our store", async () => {
    expect(await verifyUpload(file("products/7/a.webp"), own)).toBe(true);
  });

  it.each([
    ["another seller's folder", file("products/8/x.webp")],
    ["a file that doesn't exist", file("products/7/missing.webp")],
    ["a non-image file", file("products/7/c.html")],
    ["a URL on another host", file("products/7/a.webp", "evil.example.com")],
    ["a URL for a different file", { pathname: "products/7/a.webp", url: `https://${HOST}/products/7/b.jpg` }],
  ])("rejects %s", async (_name, f) => {
    expect(await verifyUpload(f, own)).toBe(false);
  });
});

describe("verifyUploads", () => {
  it("passes for no photos and for all-valid photos", async () => {
    expect(await verifyUploads([], own)).toBe(true);
    expect(await verifyUploads([file("products/7/a.webp"), file("products/7/b.jpg")], own)).toBe(true);
  });

  it("fails when any photo is bad or repeated", async () => {
    expect(await verifyUploads([file("products/7/a.webp"), file("products/8/x.webp")], own)).toBe(false);
    expect(await verifyUploads([file("products/7/a.webp"), file("products/7/a.webp")], own)).toBe(false);
  });
});
