import { describe, expect, it } from "vitest";
import { extractGuideSections } from "./visiteGuideeText";

describe("extractGuideSections (guide de visite détaillé -> album souvenir, story 30.6)", () => {
  it("returns [] for empty, missing, or blank HTML", () => {
    expect(extractGuideSections("")).toEqual([]);
    expect(extractGuideSections(null)).toEqual([]);
    expect(extractGuideSections(undefined)).toEqual([]);
    expect(extractGuideSections("   ")).toEqual([]);
  });

  it("extracts a section's title, paragraphs and bullets in order", () => {
    const html = `
      <h2 id="section-0">Histoire du lieu</h2>
      <p>Premier paragraphe.</p>
      <p>Second paragraphe.</p>
      <ul><li>Anecdote un</li><li>Anecdote deux</li></ul>
    `;

    expect(extractGuideSections(html)).toEqual([
      {
        title: "Histoire du lieu",
        paragraphs: ["Premier paragraphe.", "Second paragraphe."],
        bullets: ["Anecdote un", "Anecdote deux"],
      },
    ]);
  });

  it("splits content across multiple sections at each <h2>", () => {
    const html = `
      <h2>Section A</h2>
      <p>Texte A.</p>
      <h2>Section B</h2>
      <p>Texte B.</p>
    `;

    expect(extractGuideSections(html)).toEqual([
      { title: "Section A", paragraphs: ["Texte A."], bullets: [] },
      { title: "Section B", paragraphs: ["Texte B."], bullets: [] },
    ]);
  });

  it("ignores <img> and <audio> tags entirely", () => {
    const html = `
      <h2>Section</h2>
      <p>Avant l'image.</p>
      <img src="/images/places/x/visite-guidee/image-1.webp" />
      <audio controls src="/audio/visites-guidees/x/1.mp3"></audio>
      <p>Après le média.</p>
    `;

    expect(extractGuideSections(html)).toEqual([
      { title: "Section", paragraphs: ["Avant l'image.", "Après le média."], bullets: [] },
    ]);
  });

  it("keeps leading content (before any <h2>) as a title-less section (cas limite)", () => {
    const html = `<p>Texte orphelin.</p><h2>Section</h2><p>Texte normal.</p>`;

    expect(extractGuideSections(html)).toEqual([
      { title: "", paragraphs: ["Texte orphelin."], bullets: [] },
      { title: "Section", paragraphs: ["Texte normal."], bullets: [] },
    ]);
  });

  it("skips empty paragraphs and empty list items", () => {
    const html = `<h2>Section</h2><p></p><p>   </p><ul><li></li><li>Valide</li></ul>`;

    expect(extractGuideSections(html)).toEqual([
      { title: "Section", paragraphs: [], bullets: ["Valide"] },
    ]);
  });
});
