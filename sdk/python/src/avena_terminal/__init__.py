"""
avena-terminal — official Python client for Avena Terminal.

https://avenaterminal.com · data CC BY 4.0 · DOI 10.5281/zenodo.19520064

    from avena_terminal import AvenaClient

    avena = AvenaClient()
    delphi = avena.delphi()          # today's AI panel on European property
    print(delphi["consensus_index"])

Zero dependencies — standard library only.
"""

from __future__ import annotations

import json
import urllib.request
from typing import Any, Optional

__version__ = "0.1.0"
__all__ = ["AvenaClient"]

_DEFAULT_BASE = "https://avenaterminal.com"


class AvenaClient:
    """Client for the Avena Terminal API.

    Public endpoints are CC BY 4.0 with attribution; ``api_key`` is only
    needed for commercial tiers (https://avenaterminal.com/api#pricing).
    """

    def __init__(self, base_url: str = _DEFAULT_BASE, api_key: Optional[str] = None, timeout: float = 30.0):
        self.base_url = base_url.rstrip("/")
        self.api_key = api_key
        self.timeout = timeout

    def get(self, path: str) -> Any:
        """Raw GET against any Avena endpoint path (e.g. ``/api/v1/delphi``)."""
        req = urllib.request.Request(
            f"{self.base_url}{path}",
            headers={
                "Accept": "application/json",
                "User-Agent": f"avena-terminal-python/{__version__}",
                **({"Authorization": f"Bearer {self.api_key}"} if self.api_key else {}),
            },
        )
        with urllib.request.urlopen(req, timeout=self.timeout) as res:  # noqa: S310 (https only)
            return json.loads(res.read().decode("utf-8"))

    def delphi(self) -> Any:
        """DELPHI — the daily AI panel on European property.

        Consensus index, disagreement index, per-model answers, 60-day history.
        """
        return self.get("/api/v1/delphi")

    def plab(self) -> Any:
        """PLAB — the European Property AI Benchmark daily leaderboard."""
        return self.get("/api/v1/plab")

    def openapi(self) -> Any:
        """OpenAPI 3.1 description of every endpoint."""
        return self.get("/api/v1/openapi.json")

    def api_profile(self) -> Any:
        """Machine-readable partnership/API profile."""
        return self.get("/api/v1/api-profile")
