from rest_framework import serializers

from apps.media_processing.models import MediaJob


class MediaJobSerializer(serializers.ModelSerializer):
    class Meta:
        model = MediaJob
        fields = (
            "id",
            "file_type",
            "original_filename",
            "source_key",
            "result_key",
            "status",
            "error_message",
            "created_at",
            "updated_at",
        )
        read_only_fields = (
            "id",
            "source_key",
            "result_key",
            "status",
            "error_message",
            "created_at",
            "updated_at",
        )


class MediaUploadSerializer(serializers.Serializer):
    file = serializers.FileField()
    file_type = serializers.ChoiceField(choices=MediaJob.FileType.choices)

    def validate_file(self, obj):
        max_mb = 2048  # talabga qarab settings dan oling
        if obj.size > max_mb * 1024 * 1024:
            raise serializers.ValidationError(f"Maksimal hajm: {max_mb} MB")
        return obj
