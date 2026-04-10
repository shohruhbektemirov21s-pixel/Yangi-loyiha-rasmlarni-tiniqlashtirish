from __future__ import annotations

import numpy as np


class NoopUpscaler:
    name = "noop"

    def upscale(self, image_bgr: np.ndarray) -> np.ndarray | None:
        # Returning None keeps the original image unchanged.
        return None
