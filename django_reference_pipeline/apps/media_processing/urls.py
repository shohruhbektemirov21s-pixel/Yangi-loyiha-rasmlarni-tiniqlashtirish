from django.urls import path

from apps.media_processing import views

urlpatterns = [
    path("jobs/upload/", views.MediaUploadView.as_view(), name="media-upload"),
    path("jobs/<int:pk>/", views.MediaJobDetailView.as_view(), name="media-job-detail"),
]
