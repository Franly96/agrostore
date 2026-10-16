import { describe, expect, it } from "vitest";
import {
  isDisplayableAvatar,
  isOwnAvatarPathname,
  isOwnBlobUrl,
  isOwnPathname,
  pathnameFromUrl,
  sellerPrefix,
} from "./paths";

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

describe("isOwnAvatarPathname", () => {
  it("accepts a file directly under vendors/{id}/", () => {
    expect(isOwnAvatarPathname("vendors/7/perfil-abc.webp", 7)).toBe(true);
  });

  it.each(["vendors/8/perfil.webp", "vendors/7/", "vendors/7/a/b.webp", "products/7/perfil.webp"])(
    "rejects %s",
    (pathname) => {
      expect(isOwnAvatarPathname(pathname, 7)).toBe(false);
    },
  );
});

describe("pathnameFromUrl", () => {
  it("returns the pathname without the leading slash", () => {
    expect(pathnameFromUrl(`https://${HOST}/vendors/7/perfil.webp`)).toBe("vendors/7/perfil.webp");
  });

  it.each(["", "not a url", `http://${HOST}/a.webp`, `https://${HOST}/`])("returns null for %s", (url) => {
    expect(pathnameFromUrl(url)).toBeNull();
  });
});

describe("isDisplayableAvatar", () => {
  it("accepts the seller's own photo on a public Blob host", () => {
    expect(isDisplayableAvatar(`https://${HOST}/vendors/7/perfil.webp`, 7)).toBe(true);
  });

  it.each([
    ["empty", null],
    ["another seller", `https://${HOST}/vendors/8/perfil.webp`],
    ["product photo", `https://${HOST}/products/7/foto.webp`],
    ["foreign host", "https://evil.example.com/vendors/7/perfil.webp"],
    ["lookalike host", "https://x.public.blob.vercel-storage.com.evil.com/vendors/7/p.webp"],
    ["query string", `https://${HOST}/vendors/7/perfil.webp?x=1`],
  ])("rejects %s", (_name, url) => {
    expect(isDisplayableAvatar(url, 7)).toBe(false);
  });
});
