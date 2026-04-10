from __future__ import annotations

import argparse
import json
from pathlib import Path

from app.services.image_processing import ImageEnhancementService


def main() -> None:
    parser = argparse.ArgumentParser(description="Enhance a blurry image using ImageClear AI pipeline.")
    parser.add_argument("--input", required=True, help="Input image path")
    parser.add_argument("--output-dir", default="storage/outputs", help="Output directory")
    parser.add_argument("--config-json", default=None, help="Optional JSON string for pipeline overrides")

    args = parser.parse_args()

    config_overrides = json.loads(args.config_json) if args.config_json else None

    service = ImageEnhancementService(
        output_dir=Path(args.output_dir),
        pipeline=None,
    )

    result = service.enhance_image(
        input_path=args.input,
        config_override=config_overrides,
    )

    print(json.dumps(result.to_dict(), indent=2))


if __name__ == "__main__":
    main()
