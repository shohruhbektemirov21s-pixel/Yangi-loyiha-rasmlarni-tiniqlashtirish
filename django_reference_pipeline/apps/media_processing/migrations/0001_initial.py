import django.db.models.deletion
from django.conf import settings
from django.db import migrations, models


class Migration(migrations.Migration):
    initial = True

    dependencies = [
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]

    operations = [
        migrations.CreateModel(
            name="MediaJob",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                (
                    "file_type",
                    models.CharField(
                        choices=[("image", "Rasm"), ("video", "Video")],
                        max_length=16,
                    ),
                ),
                ("original_filename", models.CharField(blank=True, default="", max_length=255)),
                ("source_key", models.CharField(max_length=512)),
                ("result_key", models.CharField(blank=True, default="", max_length=512)),
                (
                    "status",
                    models.CharField(
                        choices=[
                            ("pending", "Kutilmoqda"),
                            ("processing", "Jarayonda"),
                            ("completed", "Tugallangan"),
                            ("failed", "Xato"),
                        ],
                        db_index=True,
                        default="pending",
                        max_length=32,
                    ),
                ),
                ("error_message", models.TextField(blank=True, default="")),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("updated_at", models.DateTimeField(auto_now=True)),
                (
                    "user",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="media_jobs",
                        to=settings.AUTH_USER_MODEL,
                    ),
                ),
            ],
            options={
                "ordering": ("-created_at",),
            },
        ),
    ]
