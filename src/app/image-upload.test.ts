import { describe, expect, it } from "vitest";
import { compressImageFileToDataUrl, computeResizedDimensions, PlaceImageError } from "./image-upload";

describe("computeResizedDimensions", () => {
  it("laisse l'image inchangée si elle tient déjà dans la limite", () => {
    expect(computeResizedDimensions(400, 300, 900)).toEqual({ width: 400, height: 300 });
  });

  it("réduit une image plus large que haute en conservant le ratio", () => {
    expect(computeResizedDimensions(3600, 1800, 900)).toEqual({ width: 900, height: 450 });
  });

  it("réduit une image plus haute que large en conservant le ratio", () => {
    expect(computeResizedDimensions(1800, 3600, 900)).toEqual({ width: 450, height: 900 });
  });

  it("ne produit jamais une dimension nulle", () => {
    const { width, height } = computeResizedDimensions(1, 100000, 900);
    expect(width).toBeGreaterThanOrEqual(1);
    expect(height).toBeGreaterThanOrEqual(1);
  });
});

describe("compressImageFileToDataUrl", () => {
  it("rejette un fichier qui n'est pas une image", async () => {
    const file = new File(["contenu"], "notice.pdf", { type: "application/pdf" });
    await expect(compressImageFileToDataUrl(file)).rejects.toBeInstanceOf(PlaceImageError);
  });
});
