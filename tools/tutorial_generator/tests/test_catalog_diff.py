from __future__ import annotations

import unittest

from tools.tutorial_generator.services.catalog_diff import compute_catalog_diff


class CatalogDiffTests(unittest.TestCase):
    def test_diff_counts_added_updated_removed_unchanged(self) -> None:
        old_catalog = {
            "steps": [
                {"fingerprint": "a", "description": "old A"},
                {"fingerprint": "b", "description": "old B"},
            ]
        }
        new_catalog = {
            "steps": [
                {"fingerprint": "a", "description": "old A"},
                {"fingerprint": "b", "description": "new B"},
                {"fingerprint": "c", "description": "new C"},
            ]
        }

        diff = compute_catalog_diff(old_catalog, new_catalog)

        self.assertEqual(diff["counts"]["added"], 1)
        self.assertEqual(diff["counts"]["updated"], 1)
        self.assertEqual(diff["counts"]["removed"], 0)
        self.assertEqual(diff["counts"]["unchanged"], 1)


if __name__ == "__main__":
    unittest.main()
