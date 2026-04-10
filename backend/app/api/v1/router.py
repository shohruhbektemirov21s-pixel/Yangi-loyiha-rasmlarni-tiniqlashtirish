from fastapi import APIRouter

from app.api.v1.endpoints.auth import router as auth_router
from app.api.v1.endpoints.billing import router as billing_router
from app.api.v1.endpoints.health import router as health_router
from app.api.v1.endpoints.images import router as images_router
from app.api.v1.endpoints.compress import router as compress_router
from app.api.v1.endpoints.video_enhance import router as video_router
from app.api.v1.endpoints.image_enhance import router as image_enhance_router
from app.api.v1.endpoints.admin import router as admin_router

v1_router = APIRouter()
v1_router.include_router(health_router, tags=["Health"])
v1_router.include_router(auth_router, prefix="/auth", tags=["Auth"])
v1_router.include_router(billing_router, prefix="/billing", tags=["Billing"])
v1_router.include_router(images_router, prefix="/images", tags=["Images"])
v1_router.include_router(compress_router, prefix="/compress", tags=["Compress"])
v1_router.include_router(video_router, prefix="/video_enhance", tags=["Video Enhance"])
v1_router.include_router(image_enhance_router, prefix="/image_enhance", tags=["Image Enhance"])
v1_router.include_router(admin_router, prefix="/admin", tags=["Admin"])
