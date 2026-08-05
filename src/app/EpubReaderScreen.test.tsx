import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { EpubReaderScreen } from "./EpubReaderScreen";

const mocks = vi.hoisted(() => {
  const displayMock = vi.fn(async () => undefined);
  const prevMock = vi.fn(async () => undefined);
  const nextMock = vi.fn(async () => undefined);
  const themesDefaultMock = vi.fn();
  const themesFontSizeMock = vi.fn();
  const themesOverrideMock = vi.fn();
  const renditionOnMock = vi.fn();
  const renditionDestroyMock = vi.fn();
  const renderToMock = vi.fn(() => ({
    display: displayMock,
    prev: prevMock,
    next: nextMock,
    destroy: renditionDestroyMock,
    on: renditionOnMock,
    themes: {
      default: themesDefaultMock,
      fontSize: themesFontSizeMock,
      override: themesOverrideMock,
    },
  }));
  const bookDestroyMock = vi.fn();
  const ePubMock = vi.fn(() => ({
    renderTo: renderToMock,
    ready: Promise.resolve(),
    loaded: {
      metadata: Promise.resolve({ title: "Mock EPUB" }),
    },
    destroy: bookDestroyMock,
  }));

  return {
    bookDestroyMock,
    displayMock,
    ePubMock,
    nextMock,
    prevMock,
    renderToMock,
    renditionDestroyMock,
    renditionOnMock,
    themesDefaultMock,
    themesFontSizeMock,
    themesOverrideMock,
  };
});

vi.mock("epubjs", () => ({
  default: mocks.ePubMock,
}));

describe("EpubReaderScreen", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  it("ouvre un fichier importe comme archive epub avec remplacements blob", async () => {
    render(<EpubReaderScreen profileId="profil-test" onBack={() => undefined} />);

    const input = screen.getByLabelText("Importer un EPUB") as HTMLInputElement;
    const file = new File([new Uint8Array([80, 75, 3, 4])], "roman.epub", {
      type: "application/epub+zip",
    });

    fireEvent.change(input, { target: { files: [file] } });

    await waitFor(() => expect(mocks.ePubMock).toHaveBeenCalledTimes(2));

    const [, options] = mocks.ePubMock.mock.calls[1] ?? [];
    expect(options).toEqual({
      encoding: "binary",
      openAs: "epub",
      replacements: "blobUrl",
    });
  });
});