#!/usr/bin/env python3
"""
The fire on /making (`components/making-video.tsx`) as a seamless loop, from
the author's MVI_5159.MOV (1920 x 1080, 25 fps, 170 frames, 6.8 s):

    python3 scripts/making-burn.py "<MVI_5159.MOV>"

Since 2026-11-17, evening (the author's asking: "not ending and starting from
black, but ending by fading into the start of the clip it takes up again, a
loop"), the clip's last `BLEND` frames dissolve into its first `BLEND`: the
file is frames BLEND .. N-BLEND as shot, then the dissolve from frames
N-BLEND .. N into 0 .. BLEND. It ends on (nearly) frame BLEND-1 and begins
again on frame BLEND, so the browser's own loop runs on with no seam and no
black; it is BLEND frames shorter than the clip (5.6 s).

The cuts are the ones the page had (matched against the earlier files):
computer 1920 x 810 from y 134, at 1600 x 676; phone 864 x 1080 from x 380,
at 640 x 800 (4:5). Each gets a still of its first frame for the poster.
Writes public/videos/making-burn{,-phone}.mp4 and -poster.jpg.
"""
import subprocess
import sys
from pathlib import Path

BLEND = 30  # frames: 1.2 s at 25 fps
FRAMES = 170
FPS = 25
OUT = Path(__file__).resolve().parent.parent / "public" / "videos"
CUTS = {
    "making-burn": ("crop=1920:810:0:134,scale=1600:676:flags=lanczos", 27),
    "making-burn-phone": ("crop=864:1080:380:0,scale=640:800:flags=lanczos", 27),
}


def run(*args: str) -> None:
    subprocess.run(["ffmpeg", "-v", "error", "-y", *args], check=True)


def main(src: str) -> None:
    d = BLEND / FPS
    for name, (cut, crf) in CUTS.items():
        graph = (
            f"[0:v]{cut},setsar=1,format=yuv420p,split=3[a][b][m];"
            f"[a]trim=start_frame=0:end_frame={BLEND},setpts=PTS-STARTPTS[head];"
            f"[b]trim=start_frame={FRAMES - BLEND}:end_frame={FRAMES},setpts=PTS-STARTPTS[tail];"
            f"[m]trim=start_frame={BLEND}:end_frame={FRAMES - BLEND},setpts=PTS-STARTPTS[mid];"
            f"[tail][head]xfade=transition=fade:duration={d}:offset=0[dissolve];"
            f"[mid][dissolve]concat=n=2:v=1:a=0[out]"
        )
        mp4 = OUT / f"{name}.mp4"
        run("-i", src, "-filter_complex", graph, "-map", "[out]", "-an",
            "-c:v", "libx264", "-preset", "veryfast", "-crf", str(crf), "-pix_fmt", "yuv420p",
            "-movflags", "+faststart", str(mp4))
        run("-i", str(mp4), "-frames:v", "1", "-q:v", "3", str(OUT / f"{name}-poster.jpg"))
        print(f"{mp4.name}: {mp4.stat().st_size // 1024} KB")


if __name__ == "__main__":
    main(sys.argv[1])
