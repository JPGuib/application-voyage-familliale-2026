from __future__ import annotations

import unittest

from tools.tutorial_generator.services.deterministic_accueil import build_accueil_catalog


class DeterministicAccueilTests(unittest.TestCase):
    def test_preserves_previous_description_when_fingerprint_matches(self) -> None:
        initial = build_accueil_catalog(existing=None).to_dict()
        first_step = initial["steps"][0]
        first_step["description"] = "Texte personnalisé conservé"

        existing = {"steps": [first_step]}
        updated = build_accueil_catalog(existing=existing).to_dict()

        self.assertEqual(updated["steps"][0]["description"], "Texte personnalisé conservé")


if __name__ == "__main__":
    unittest.main()
