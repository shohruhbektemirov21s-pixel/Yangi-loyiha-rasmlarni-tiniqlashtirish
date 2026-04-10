from __future__ import annotations

from pathlib import Path

import numpy as np


class RealESRGANUpscaler:
    """
    Optional Real-ESRGAN adapter.

    This class only applies upscaling when dependencies are installed and a
    valid model file is available. If not, it safely returns None.
    """

    name = "real_esrgan"

    def __init__(self, model_path: str | Path) -> None:
        self.model_path = Path(model_path)

    def upscale(self, image_bgr: np.ndarray) -> np.ndarray | None:
        if not self.model_path.exists():
            return None

        try:
            from basicsr.archs.rrdbnet_arch import RRDBNet
            from realesrgan import RealESRGANer
        except Exception:
            return None

        model = RRDBNet(
            num_in_ch=3,
            num_out_ch=3,
            num_feat=64,
            num_block=23,
            num_grow_ch=32,
            scale=4,
        )
        upsampler = RealESRGANer(
            scale=4,
            model_path=str(self.model_path),
            model=model,
            tile=0,
            tile_pad=10,
            pre_pad=0,
            half=False,
        )

        try:
            output, _ = upsampler.enhance(image_bgr, outscale=2)
            if output is None or output.size == 0:
                return None
            return output
        except Exception:
            return None
