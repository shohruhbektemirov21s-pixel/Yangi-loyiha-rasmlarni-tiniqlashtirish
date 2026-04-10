from app.services.image_processing.config import PipelineConfig


def test_pipeline_config_with_overrides_merges_nested_values() -> None:
    base = PipelineConfig()
    updated = base.with_overrides(
        {
            "denoise": {"photo_strength": 12},
            "deskew": {"enabled": False, "max_angle_degrees": 12.5},
            "tone": {"brightness_factor_photo": 1.1},
            "readability": {"edge_boost_document": 0.25},
            "output": {"format": "jpg"},
        }
    )

    assert updated.denoise.photo_strength == 12
    assert updated.deskew.enabled is False
    assert updated.deskew.max_angle_degrees == 12.5
    assert updated.tone.brightness_factor_photo == 1.1
    assert updated.readability.edge_boost_document == 0.25
    assert updated.output.format == "jpg"

    # Ensure untouched values remain from defaults.
    assert updated.denoise.screenshot_strength == base.denoise.screenshot_strength
    assert updated.deskew.min_angle_degrees == base.deskew.min_angle_degrees
