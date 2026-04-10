from __future__ import annotations

from typing import Protocol

from app.core.config import Settings


class QueueBackend(Protocol):
    def enqueue(self, func, *args, priority: int = 0, **kwargs) -> None:
        ...


class SyncQueueBackend:
    """
    Queue backend used for MVP.

    Tasks run synchronously in-process. This class provides a stable interface
    so it can be replaced with Celery, RQ, or another distributed queue later.
    """

    def enqueue(self, func, *args, priority: int = 0, **kwargs) -> None:
        _ = priority
        func(*args, **kwargs)


def get_queue_backend(settings: Settings) -> QueueBackend:
    if settings.queue_backend == "sync":
        return SyncQueueBackend()

    # Fallback to sync backend for unknown values to keep MVP operational.
    return SyncQueueBackend()
