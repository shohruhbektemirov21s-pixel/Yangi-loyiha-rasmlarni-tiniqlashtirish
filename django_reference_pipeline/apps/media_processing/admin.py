from django.contrib import admin

from apps.media_processing.models import MediaJob


@admin.register(MediaJob)
class MediaJobAdmin(admin.ModelAdmin):
    list_display = ("id", "user", "file_type", "status", "created_at")
    list_filter = ("status", "file_type")
    search_fields = ("user__email", "source_key", "result_key")
    readonly_fields = ("created_at", "updated_at")
