from __future__ import annotations

import json
from dataclasses import dataclass
from pathlib import Path


@dataclass(frozen=True)
class GeneratorConfig:
    route: str
    generation_mode: str
    catalog_path: Path
    driver_output_path: Path
    report_path: Path


DEFAULT_CONFIG_PATH = Path("docs/tutorials/tutorial-generator.config.json")


def load_config(project_root: Path, config_path: Path | None = None) -> GeneratorConfig:
    path = project_root / (config_path or DEFAULT_CONFIG_PATH)
    payload = json.loads(path.read_text(encoding="utf-8"))
    output = payload["output"]

    return GeneratorConfig(
        route=payload.get("route", "dashboard"),
        generation_mode=payload.get("generation_mode", "deterministic"),
        catalog_path=project_root / output.get("catalog", "docs/tutorials/tutorial-catalog.json"),
        driver_output_path=project_root
        / output.get("driver_ts", "src/app/tutorials/generated/driver-accueil.ts"),
        report_path=project_root / output.get("report", "docs/tutorials/tutorial-diff-report.md"),
    )
