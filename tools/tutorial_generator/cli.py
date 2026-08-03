from __future__ import annotations

import argparse
import sys
from pathlib import Path

if __package__ in (None, ""):
    sys.path.insert(0, str(Path(__file__).resolve().parents[2]))

from tools.tutorial_generator.config import GeneratorConfig, load_config
from tools.tutorial_generator.repositories.catalog_repository import load_catalog, save_catalog
from tools.tutorial_generator.services.catalog_diff import compute_catalog_diff, render_diff_report
from tools.tutorial_generator.services.deterministic_accueil import build_accueil_catalog
from tools.tutorial_generator.services.driverjs_emitter import emit_driver_steps_ts


def _write_text(path: Path, content: str) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(content, encoding="utf-8")


def generate(config: GeneratorConfig) -> int:
    old_catalog = load_catalog(config.catalog_path)
    new_catalog = build_accueil_catalog(existing=old_catalog, route=config.route).to_dict()
    save_catalog(config.catalog_path, new_catalog)

    driver_ts = emit_driver_steps_ts(new_catalog)
    _write_text(config.driver_output_path, driver_ts)

    diff = compute_catalog_diff(old_catalog, new_catalog)
    report = render_diff_report(diff, config.route)
    _write_text(config.report_path, report)

    print("Tutorial generation completed.")
    print(f"- Catalog: {config.catalog_path}")
    print(f"- Driver.js export: {config.driver_output_path}")
    print(f"- Diff report: {config.report_path}")
    return 0


def parse_args(argv: list[str]) -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Generate accueil tutorials (deterministic V1).")
    parser.add_argument(
        "--config",
        default="docs/tutorials/tutorial-generator.config.json",
        help="Path to generator config file relative to project root.",
    )
    return parser.parse_args(argv)


def main(argv: list[str] | None = None) -> int:
    args = parse_args(argv or sys.argv[1:])
    project_root = Path(__file__).resolve().parents[2]
    config = load_config(project_root, Path(args.config))
    return generate(config)


if __name__ == "__main__":
    raise SystemExit(main())
