from fastapi import APIRouter, Depends, File, Query, UploadFile, status
from sqlalchemy.orm import Session

from app.core.dependencies import get_billing_service, get_current_user, get_image_job_service
from app.db.session import get_db
from app.models.user import User
from app.schemas.image import (
    DeleteHistoryData,
    DeleteHistoryResponse,
    HistoryItemData,
    HistoryListData,
    HistoryListResponse,
    ImageResultData,
    ImageResultResponse,
    UploadImageData,
    UploadImageResponse,
    UsageQuotaData,
)
from app.services.billing import BillingService
from app.services.image_job_service import ImageJobService

router = APIRouter()


@router.post(
    "/upload",
    response_model=UploadImageResponse,
    status_code=status.HTTP_201_CREATED,
)
async def upload_image(
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
    job_service: ImageJobService = Depends(get_image_job_service),
    billing_service: BillingService = Depends(get_billing_service),
) -> UploadImageResponse:
    image = await job_service.create_upload(db=db, upload_file=file, user_id=current_user.id)
    usage_snapshot = billing_service.get_usage_snapshot(db=db, user_id=current_user.id)
    usage = UsageQuotaData(
        usage_date=usage_snapshot.usage_date.isoformat(),
        uploads_used=usage_snapshot.uploads_used,
        uploads_limit=usage_snapshot.uploads_limit,
        uploads_remaining=usage_snapshot.uploads_remaining,
    )

    return UploadImageResponse(
        success=True,
        message="Image uploaded successfully.",
        data=UploadImageData.from_model(image, usage=usage),
    )


@router.get("/{image_id}/result", response_model=ImageResultResponse)
def get_image_result(
    image_id: str,
    process_if_pending: bool = Query(default=True),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
    job_service: ImageJobService = Depends(get_image_job_service),
) -> ImageResultResponse:
    image = job_service.get_result(
        db=db,
        image_id=image_id,
        user_id=current_user.id,
        process_if_pending=process_if_pending,
    )

    return ImageResultResponse(
        success=True,
        message="Image result fetched successfully.",
        data=ImageResultData.from_model(image),
    )


@router.get("/history", response_model=HistoryListResponse)
def get_processing_history(
    limit: int = Query(default=20, ge=1, le=100),
    offset: int = Query(default=0, ge=0),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
    job_service: ImageJobService = Depends(get_image_job_service),
) -> HistoryListResponse:
    items, total = job_service.get_history(db=db, limit=limit, offset=offset, user_id=current_user.id)
    return HistoryListResponse(
        success=True,
        message="Processing history fetched successfully.",
        data=HistoryListData(
            items=[HistoryItemData.from_model(item) for item in items],
            total=total,
            limit=limit,
            offset=offset,
        ),
    )


@router.delete("/history/{image_id}", response_model=DeleteHistoryResponse)
def delete_history_item(
    image_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
    job_service: ImageJobService = Depends(get_image_job_service),
) -> DeleteHistoryResponse:
    job_service.delete_history_item(db=db, image_id=image_id, user_id=current_user.id)
    return DeleteHistoryResponse(
        success=True,
        message="History item deleted successfully.",
        data=DeleteHistoryData(id=image_id),
    )
