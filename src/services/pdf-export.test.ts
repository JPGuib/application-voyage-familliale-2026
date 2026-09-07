import { describe, expect, it } from "vitest";
import {
  calculateExportLimit,
  preparePdfImages,
} from "./pdf-export";

describe("pdf export limits", () => {
  it("blocks export when image count exceeds the browser-safe limit", () => {
    const result = calculateExportLimit({
      imageCount: 61,
      preparedBytes: 1024,
    });

    expect(result.allowed).toBe(false);
    expect(result.reason).toContain("60");
  });

  it("blocks export when prepared payload is too large", () => {
    const result = calculateExportLimit({
      imageCount: 10,
      preparedBytes: 21 * 1024 * 1024,
    });

    expect(result.allowed).toBe(false);
    expect(result.reason).toMatch(/20\s*MiB|20 MiB|20MB/i);
  });

  it("keeps valid JPEG images and ignores unreadable data", () => {
    const prepared = preparePdfImages([
      { id: "good", src: "data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAA" },
      { id: "bad", src: "not-a-data-uri" },
      { id: "png", src: "data:image/png;base64,abcd" },
    ]);

    expect(prepared.valid).toHaveLength(1);
    expect(prepared.valid[0].id).toBe("good");
    expect(prepared.invalid).toHaveLength(2);
  });
});
