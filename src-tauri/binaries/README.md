# FFmpeg Setup Instructions

This application requires FFmpeg to function. Due to licensing and file size limits, it is not bundled in the repo.

1. **Download FFmpeg**:
   - Go to [FFmpeg Download](https://ffmpeg.org/download.html).
   - Download a static build for Windows (e.g. from gyan.dev).
   - Extract the `ffmpeg.exe` file.

2. **Rename and Place**:
   - You must rename `ffmpeg.exe` to include your target triple.
   - Run `rustc -vV` in a terminal to see your `host` target.
     - Example: `x86_64-pc-windows-msvc`
   - Rename to: `ffmpeg-x86_64-pc-windows-msvc.exe`
   - Place it in: `src-tauri/binaries/`

**Note**: If you are on a different architecture, adjust the suffix accordingly.
