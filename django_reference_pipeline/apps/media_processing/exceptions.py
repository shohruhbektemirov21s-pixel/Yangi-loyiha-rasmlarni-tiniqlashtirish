class ProcessingError(Exception):
    """Real-ESRGAN, FFmpeg yoki S3 bo'yicha biznes-xato."""

    def __init__(self, message: str, *, exit_code: int | None = None) -> None:
        super().__init__(message)
        self.exit_code = exit_code


class StorageError(Exception):
    """Faylni o'qish/yozish yoki S3 xatolari."""
