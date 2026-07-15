import { describe, expect, it } from "vitest";
import { parseCloudSnapshot } from "./cloudSyncProvider";

describe("cloudSyncProvider phase migration", () => {
  it("uses family-wide phase when available", () => {
    const snapshot = parseCloudSnapshot({
      phase: "during",
      profiles: {
        "profile-a": {
          surname: "A",
          role: "proprietaire",
          createdAt: 1,
          lastSyncAt: 2,
        },
      },
    });

    expect(snapshot.phase).toBe("during");
    expect(snapshot.profiles["profile-a"]?.phase).toBe("before");
  });

  it("falls back to legacy phase map when family-wide phase is absent", () => {
    const snapshot = parseCloudSnapshot({
      phase: {
        "profile-a": "before",
        "profile-b": "during",
      },
      profiles: {
        "profile-a": {
          surname: "A",
          role: "proprietaire",
          createdAt: 1,
          lastSyncAt: 2,
        },
        "profile-b": {
          surname: "B",
          role: "utilisateur",
          createdAt: 1,
          lastSyncAt: 2,
        },
      },
    });

    expect(snapshot.phase).toBe("during");
    expect(snapshot.profiles["profile-a"]?.phase).toBe("before");
    expect(snapshot.profiles["profile-b"]?.phase).toBe("during");
  });

  it("defaults to before when no phase data exists", () => {
    const snapshot = parseCloudSnapshot({
      profiles: {},
    });

    expect(snapshot.phase).toBe("before");
  });
});
