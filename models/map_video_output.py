# This file is kept for backwards compatibility.
# All video models have been moved to models/video_output.py
# This file can be safely deleted.

from models.video_output import (
    VideoRequest,
    VideoTextOverlay,
    VideoSlide,
    VideoScript,
    VideoOutput,
)

__all__ = [
    "VideoRequest",
    "VideoTextOverlay",
    "VideoSlide",
    "VideoScript",
    "VideoOutput",
]
