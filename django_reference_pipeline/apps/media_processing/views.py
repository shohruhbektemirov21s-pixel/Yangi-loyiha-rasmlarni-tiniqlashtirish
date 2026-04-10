import uuid

from django.core.files.base import ContentFile
from django.core.files.storage import default_storage
from rest_framework import status
from rest_framework.parsers import FormParser, MultiPartParser
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.media_processing.models import MediaJob
from apps.media_processing.serializers import MediaJobSerializer, MediaUploadSerializer
from apps.media_processing.tasks import process_media_job


class MediaUploadView(APIView):
    """
    POST /api/jobs/upload/
    multipart: file, file_type = image | video
    """

    parser_classes = (MultiPartParser, FormParser)

    def post(self, request):
        ser = MediaUploadSerializer(data=request.data)
        if not ser.is_valid():
            return Response(ser.errors, status=status.HTTP_400_BAD_REQUEST)

        upload = ser.validated_data["file"]
        file_type = ser.validated_data["file_type"]
        original_name = getattr(upload, "name", "") or "upload.bin"
        ext = original_name.rsplit(".", 1)[-1] if "." in original_name else "bin"
        key = f"uploads/{request.user.id}/{uuid.uuid4().hex}.{ext}"

        try:
            data = upload.read()
            saved_key = default_storage.save(key, ContentFile(data))
        except Exception as exc:
            return Response(
                {"detail": f"Fayl saqlanmadi: {exc}"},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )

        job = MediaJob.objects.create(
            user=request.user,
            file_type=file_type,
            original_filename=original_name,
            source_key=saved_key,
            status=MediaJob.Status.PENDING,
        )

        # Asinxron navbat
        process_media_job.delay(job.id)

        return Response(
            MediaJobSerializer(job).data,
            status=status.HTTP_202_ACCEPTED,
        )


class MediaJobDetailView(APIView):
    """GET /api/jobs/<id>/ — holat va natija kaliti."""

    def get(self, request, pk: int):
        try:
            job = MediaJob.objects.get(pk=pk, user=request.user)
        except MediaJob.DoesNotExist:
            return Response(status=status.HTTP_404_NOT_FOUND)
        return Response(MediaJobSerializer(job).data)
