"""
Wraps yt-dlp to download a YouTube video + metadata to local disk.
Runs in a background thread so the API request returns immediately
and the frontend can poll video status (pending -> downloading -> ready).
"""
import os
import yt_dlp

BASE_DIR = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
DOWNLOAD_DIR = os.path.join(BASE_DIR, "downloads")
os.makedirs(DOWNLOAD_DIR, exist_ok=True)


def download_video(youtube_url: str, video_id: int) -> dict:
    """
    Downloads the video (capped at 720p to keep file sizes sane) and
    returns metadata: title, duration_sec, local_path, thumbnail_path.
    Raises an exception on failure - caller is responsible for catching
    it and marking the video as 'failed' in the DB.
    """
    out_template = os.path.join(DOWNLOAD_DIR, f"{video_id}_%(id)s.%(ext)s")

    ydl_opts = {
        # Try: separate best video+audio under 720p merged into mp4 (needs ffmpeg)
        # -> fall back to any single pre-merged format under 720p
        # -> fall back to whatever the single best available format is.
        # This chain avoids "Requested format is not available" errors that
        # happen when a video doesn't have a progressive (pre-merged) stream.
        "format": (
            "bestvideo[height<=720][vcodec^=avc1]+bestaudio[acodec^=mp4a]/"
            "bestvideo[height<=720]+bestaudio/"
	    "best[height<=720]/"
            "best"
        ),
        "merge_output_format": "mp4",
        "postprocessor_args": {
            "ffmpeg": ["-movflags", "+faststart"],
        },
        "outtmpl": out_template,
        "writethumbnail": True,
        "noplaylist": True,
        "quiet": True,
        "no_warnings": True,
    }

    with yt_dlp.YoutubeDL(ydl_opts) as ydl:
        info = ydl.extract_info(youtube_url, download=True)
        local_path = ydl.prepare_filename(info)

    # yt-dlp saves the thumbnail next to the video with a different extension
    thumbnail_path = None
    base_no_ext = os.path.splitext(local_path)[0]
    for ext in (".jpg", ".webp", ".png"):
        candidate = base_no_ext + ext
        if os.path.exists(candidate):
            thumbnail_path = candidate
            break

    return {
        "title": info.get("title"),
        "duration_sec": int(info.get("duration") or 0),
        "local_path": local_path,
        "thumbnail_path": thumbnail_path,
    }
