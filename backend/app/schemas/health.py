from datetime import datetime

from pydantic import BaseModel


class HealthData(BaseModel):
    status: str
    service: str
    version: str
    timestamp: datetime


class HealthResponse(BaseModel):
    success: bool
    message: str
    data: HealthData
