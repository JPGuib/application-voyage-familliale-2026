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

  it("keeps checklist and game history isolated per profile", () => {
    const snapshot = parseCloudSnapshot({
      phase: "during",
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
      checklists: {
        "profile-a": {
          bagage: true,
        },
        "profile-b": {
          bagage: false,
          passeport: true,
        },
      },
      gameResults: {
        "profile-a": [
          {
            day: 1,
            location: "Istanbul",
            quizScore: 20,
            correctCount: 2,
            riddleSolved: true,
            challengeDone: false,
            durationSec: 90,
            totalScore: 30,
            completedAt: "2026-07-15T10:00:00.000Z",
          },
        ],
        "profile-b": [
          {
            day: 1,
            location: "Istanbul",
            quizScore: 10,
            correctCount: 1,
            riddleSolved: false,
            challengeDone: true,
            durationSec: 130,
            totalScore: 25,
            completedAt: "2026-07-15T10:01:00.000Z",
          },
        ],
      },
    });

    expect(snapshot.profiles["profile-a"]?.checklist).toEqual({ bagage: true });
    expect(snapshot.profiles["profile-b"]?.checklist).toEqual({ bagage: false, passeport: true });
    expect(snapshot.profiles["profile-a"]?.gameResults).toHaveLength(1);
    expect(snapshot.profiles["profile-b"]?.gameResults).toHaveLength(1);
    expect(snapshot.profiles["profile-a"]?.gameResults[0]?.quizScore).toBe(20);
    expect(snapshot.profiles["profile-b"]?.gameResults[0]?.quizScore).toBe(10);
  });

  it("normalizes owner uniqueness and exposes shared phase coherently", () => {
    const snapshot = parseCloudSnapshot({
      phase: "during",
      ownerProfileId: "profile-a",
      profiles: {
        "profile-a": {
          surname: "A",
          role: "proprietaire",
          createdAt: 1,
          lastSyncAt: 2,
        },
        "profile-b": {
          surname: "B",
          role: "proprietaire",
          createdAt: 1,
          lastSyncAt: 2,
        },
      },
    });

    expect(snapshot.phase).toBe("during");
    expect(snapshot.familyState.ownerProfileId).toBe("profile-a");
    expect(snapshot.familyState.profiles.find((profile) => profile.id === "profile-a")?.role).toBe(
      "proprietaire"
    );
    expect(snapshot.familyState.profiles.find((profile) => profile.id === "profile-b")?.role).toBe(
      "utilisateur"
    );
  });

  it("parses profile-scoped password and recovery hashes when present", () => {
    const snapshot = parseCloudSnapshot({
      phase: "before",
      profiles: {
        "profile-a": {
          surname: "A",
          role: "proprietaire",
          createdAt: 1,
          lastSyncAt: 2,
          passwordHash: "sha256:" + "a".repeat(64),
          recoveryHash: "sha256:" + "b".repeat(64),
          recoveryConfiguredAt: 123,
        },
      },
    });

    expect(snapshot.profiles["profile-a"]?.passwordHash).toBe("sha256:" + "a".repeat(64));
    expect(snapshot.profiles["profile-a"]?.recoveryHash).toBe("sha256:" + "b".repeat(64));
    expect(snapshot.profiles["profile-a"]?.recoveryConfiguredAt).toBe(123);
  });

  it("drops recovery metadata when recovery hash is empty", () => {
    const snapshot = parseCloudSnapshot({
      phase: "before",
      profiles: {
        "profile-a": {
          surname: "A",
          role: "proprietaire",
          createdAt: 1,
          lastSyncAt: 2,
          recoveryHash: "",
          recoveryConfiguredAt: 123,
        },
      },
    });

    expect(snapshot.profiles["profile-a"]?.recoveryHash).toBeUndefined();
    expect(snapshot.profiles["profile-a"]?.recoveryConfiguredAt).toBeUndefined();
  });
});
