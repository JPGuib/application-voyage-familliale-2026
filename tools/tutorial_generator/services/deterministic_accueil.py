from __future__ import annotations

import hashlib
from datetime import datetime, timezone

from tools.tutorial_generator.models import TutorialCatalog, TutorialStep


BASE_ELEMENTS = [
    {
        "step_id": "accueil-settings",
        "selector": '[data-tutorial-id="dashboard-settings"]',
        "title": "Ouvrir les paramètres",
        "description": "Accédez aux paramètres du profil et des préférences de l'application.",
        "category": "configuration",
        "priority": 100,
        "audience_level": "decouverte",
    },
    {
        "step_id": "accueil-destination",
        "selector": '[data-tutorial-id="dashboard-today-card"]',
        "title": "Voir la destination du jour",
        "description": "Consultez la destination en cours et ouvrez rapidement le guide du séjour.",
        "category": "navigation",
        "priority": 95,
        "audience_level": "decouverte",
    },
    {
        "step_id": "accueil-planning",
        "selector": '[data-tutorial-id="dashboard-planning"]',
        "title": "Ouvrir le planning complet",
        "description": "Affichez tous les jours du séjour pour planifier les prochaines étapes.",
        "category": "navigation",
        "priority": 90,
        "audience_level": "premiere-utilisation",
    },
    {
        "step_id": "accueil-map-preview",
        "selector": '[data-tutorial-id="dashboard-map-preview"]',
        "title": "Agrandir la carte du séjour",
        "description": "Ouvrez la carte en grand format pour visualiser le circuit global.",
        "category": "exploration",
        "priority": 80,
        "audience_level": "decouverte",
    },
        {
            "step_id": "accueil-arcade",
            "selector": '[data-tutorial-id="dashboard-arcade"]',
            "title": "Espace ludique",
            "description": "Accédez aux petits jeux disponibles en solo ou en équipe : Trivial Turquie, Bazar Crush, L'Ordalie et L'Imposteur.",
            "category": "divertissement",
            "priority": 78,
            "audience_level": "decouverte",
        },
        {
            "step_id": "accueil-stay-presentation",
            "selector": '[data-tutorial-id="dashboard-stay-presentation"]',
            "title": "Présentation du séjour",
            "description": "Ouvrez la visionneuse pour parcourir les images de présentation du séjour.",
            "category": "exploration",
            "priority": 77,
            "audience_level": "decouverte",
        },
        {
            "step_id": "accueil-checklist",
            "selector": '[data-tutorial-id="dashboard-quick-checklist"]',
            "title": "Checklist",
            "description": "Retrouvez ici les éléments à préparer avant le départ et suivez votre progression.",
            "category": "preparation",
            "priority": 76,
            "audience_level": "premiere-utilisation",
        },
        {
            "step_id": "accueil-offline-media",
            "selector": '[data-tutorial-id="dashboard-offline-media"]',
            "title": "Mode hors-ligne",
            "description": "Téléchargez à l'avance les contenus du séjour pour y accéder sans connexion.",
            "category": "preparation",
            "priority": 75,
            "audience_level": "premiere-utilisation",
        },
    {
        "step_id": "accueil-bottom-nav",
        "selector": '[data-tutorial-id="bottom-nav-dashboard"]',
        "title": "Revenir à l'accueil",
        "description": "Utilisez la navigation basse pour revenir rapidement à l'écran Accueil.",
        "category": "navigation",
        "priority": 70,
        "audience_level": "decouverte",
    },
]


def _fingerprint(route: str, selector: str, title: str) -> str:
    raw = f"{route}|{selector}|{title}".encode("utf-8")
    return hashlib.sha256(raw).hexdigest()[:16]


def build_accueil_catalog(existing: dict | None, route: str = "dashboard") -> TutorialCatalog:
    previous_by_fingerprint: dict[str, dict] = {}
    if existing:
        for step in existing.get("steps", []):
            fp = step.get("fingerprint")
            if fp:
                previous_by_fingerprint[fp] = step

    steps: list[TutorialStep] = []
    for item in BASE_ELEMENTS:
        fp = _fingerprint(route, item["selector"], item["title"])
        description = item["description"]
        old = previous_by_fingerprint.get(fp)
        if old and isinstance(old.get("description"), str) and old["description"].strip():
            description = old["description"]

        steps.append(
            TutorialStep(
                step_id=item["step_id"],
                route=route,
                selector=item["selector"],
                title=item["title"],
                description=description,
                category=item["category"],
                priority=item["priority"],
                audience_level=item["audience_level"],
                fingerprint=fp,
            )
        )

    return TutorialCatalog(
        version="1.0",
        scope="accueil-only",
        generated_at=datetime.now(timezone.utc).isoformat(),
        generation_mode="deterministic-no-llm",
        routes=[route],
        steps=steps,
    )
