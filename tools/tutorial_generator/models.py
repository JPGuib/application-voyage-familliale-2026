from __future__ import annotations

from dataclasses import asdict, dataclass
from typing import Any


@dataclass(frozen=True)
class TutorialStep:
    step_id: str
    route: str
    selector: str
    title: str
    description: str
    category: str
    priority: int
    audience_level: str
    fingerprint: str

    def to_dict(self) -> dict[str, Any]:
        return asdict(self)


@dataclass(frozen=True)
class TutorialCatalog:
    version: str
    scope: str
    generated_at: str
    generation_mode: str
    routes: list[str]
    steps: list[TutorialStep]

    def to_dict(self) -> dict[str, Any]:
        return {
            "version": self.version,
            "scope": self.scope,
            "generated_at": self.generated_at,
            "generation_mode": self.generation_mode,
            "routes": self.routes,
            "steps": [step.to_dict() for step in self.steps],
        }
