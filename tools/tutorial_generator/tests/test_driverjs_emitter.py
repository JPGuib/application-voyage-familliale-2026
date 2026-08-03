from __future__ import annotations

import unittest

from tools.tutorial_generator.services.driverjs_emitter import emit_driver_steps_ts


class DriverEmitterTests(unittest.TestCase):
    def test_emits_driver_step_array(self) -> None:
        catalog = {
            "steps": [
                {
                    "selector": "[data-tutorial-id=\"dashboard-settings\"]",
                    "title": "Ouvrir",
                    "description": "Description",
                }
            ]
        }

        emitted = emit_driver_steps_ts(catalog)

        self.assertIn("export const ACCUEIL_DRIVER_STEPS", emitted)
        self.assertIn("dashboard-settings", emitted)
        self.assertIn("Description", emitted)


if __name__ == "__main__":
    unittest.main()
