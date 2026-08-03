from __future__ import annotations

from typing import Any


def compute_catalog_diff(old_catalog: dict[str, Any] | None, new_catalog: dict[str, Any]) -> dict[str, Any]:
    old_steps = {step["fingerprint"]: step for step in (old_catalog or {}).get("steps", [])}
    new_steps = {step["fingerprint"]: step for step in new_catalog.get("steps", [])}

    old_keys = set(old_steps)
    new_keys = set(new_steps)

    added = sorted(new_keys - old_keys)
    removed = sorted(old_keys - new_keys)
    unchanged = sorted(k for k in new_keys & old_keys if old_steps[k] == new_steps[k])
    updated = sorted((new_keys & old_keys) - set(unchanged))

    return {
        "added": added,
        "updated": updated,
        "removed": removed,
        "unchanged": unchanged,
        "counts": {
            "added": len(added),
            "updated": len(updated),
            "removed": len(removed),
            "unchanged": len(unchanged),
        },
    }


def render_diff_report(diff: dict[str, Any], route: str) -> str:
    counts = diff["counts"]
    lines = [
        "# Tutorial Generation Diff Report",
        "",
        f"Route scope: {route}",
        "",
        "## Summary",
        "",
        f"- Added: {counts['added']}",
        f"- Updated: {counts['updated']}",
        f"- Removed: {counts['removed']}",
        f"- Unchanged: {counts['unchanged']}",
        "",
    ]

    for key in ("added", "updated", "removed"):
        lines.append(f"## {key.capitalize()}")
        lines.append("")
        values = diff[key]
        if values:
            lines.extend(f"- {value}" for value in values)
        else:
            lines.append("- none")
        lines.append("")

    return "\n".join(lines)
