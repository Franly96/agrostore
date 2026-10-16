import { describe, expect, it } from "vitest";
import { isOwnBlobUrl, isOwnPathname, sellerPrefix } from "./paths";

const HOST = "abc123xyz.public.blob.vercel-storage.com";

describe("isOwnPathname", () => {
  it("accepts a file directly under the seller prefix", () => {
    expect(sellerPrefix(7)).toBe("products/7/");
    expect(isOwnPathname("products/7/foto-abc.webp", 7)).toBe(true);
  });

  it.each([
    "products/8/foto.webp",
    "products/77/foto.webp",
    "products/7/",
    "products/7/sub/foto.webp",
    "products/7/../8/foto.webp",
    "other/7/foto.webp",
  ])("rejects %s", (pathname) => {
    expect(isOwnPathname(pathname, 7)).toBe(false);
  });
});

describe("isOwnBlobUrl", () => {
  const pathname = "products/7/foto.webp";

  it("accepts https on our host with a matching pathname", () => {
    expect(isOwnBlobUrl(`https://${HOST}/${pathname}`, pathname, HOST)).toBe(
      true,
    );
  });

  it.each([
    ["foreign host", `https://evil.example.com/${pathname}`],
    ["http", `http://${HOST}/${pathname}`],
    ["other pathname", `https://${HOST}/products/7/otra.webp`],
    ["query string", `https://${HOST}/${pathname}?x=1`],
    ["custom port", `https://${HOST}:8443/${pathname}`],
    ["not a url", "javascript:alert(1)"],
  ])("rejects %s", (_name, url) => {
    expect(isOwnBlobUrl(url, pathname, HOST)).toBe(false);
  });

  it("rejects everything when the store host is unknown", () => {
    expect(isOwnBlobUrl(`https://${HOST}/${pathname}`, pathname, null)).toBe(
      false,
    );
  });
});
