use crate::error::CommandResult;
use serde::Serialize;
use std::path::PathBuf;
use tauri::Emitter;
use tauri_plugin_shell::process::CommandEvent;
use tauri_plugin_shell::ShellExt;

#[derive(Clone, Serialize)]
struct ProgressPayload {
    progress: f64, // 0.0 to 100.0
    status: String,
}

fn parse_progress(line: &str) -> Option<u64> {
    let parts: Vec<&str> = line.split('=').collect();
    if parts.len() == 2 && parts[0].trim() == "out_time_us" {
        return parts[1].trim().parse::<u64>().ok();
    }
    None
}

pub async fn trim(
    input: String,
    output: String,
    start: f64,
    duration: f64, // Target duration in seconds
    window: tauri::Window,
) -> CommandResult<String> {
    let input_path = PathBuf::from(&input);
    let output_path = PathBuf::from(&output);

    // ffmpeg -i input.mp4 -ss 0.0 -t 5.0 -c copy output.mp4 -y -progress pipe:1
    let cmd = window
        .shell()
        .sidecar("ffmpeg")
        .map_err(|e| crate::error::CommandError::FFmpegError(e.to_string()))?
        .args([
            "-i",
            input_path.to_str().unwrap(),
            "-ss",
            &start.to_string(),
            "-t",
            &duration.to_string(),
            "-c",
            "copy",
            "-y",
            "-progress",
            "pipe:1",
            output_path.to_str().unwrap(),
        ]);

    let (mut rx, _) = cmd
        .spawn()
        .map_err(|e| crate::error::CommandError::FFmpegError(e.to_string()))?;

    let total_us = (duration * 1_000_000.0) as u64;

    while let Some(event) = rx.recv().await {
        match event {
            CommandEvent::Terminated(payload) => {
                if let Some(code) = payload.code {
                    if code != 0 {
                        return Err(crate::error::CommandError::FFmpegError(format!(
                            "FFmpeg process exited with code {}",
                            code
                        )));
                    }
                }
            }
            CommandEvent::Error(err) => return Err(crate::error::CommandError::FFmpegError(err)),
            CommandEvent::Stdout(line) => {
                let line_str = String::from_utf8_lossy(&line);
                for l in line_str.lines() {
                    if let Some(us) = parse_progress(l) {
                        if total_us > 0 {
                            let percent = (us as f64 / total_us as f64) * 100.0;
                            // Clamp to 100
                            let percent = if percent > 100.0 { 100.0 } else { percent };
                            window
                                .emit(
                                    "progress",
                                    ProgressPayload {
                                        progress: percent,
                                        status: "processing".to_string(),
                                    },
                                )
                                .unwrap_or(());
                        }
                    }
                }
            }
            _ => {}
        }
    }

    Ok(output)
}

pub async fn resize(
    input: String,
    output: String,
    width: u32,
    height: u32,
    total_duration_sec: f64, // Need original duration to calc progress
    window: tauri::Window,
) -> CommandResult<String> {
    let input_path = PathBuf::from(&input);
    let output_path = PathBuf::from(&output);

    let cmd = window
        .shell()
        .sidecar("ffmpeg")
        .map_err(|e| crate::error::CommandError::FFmpegError(e.to_string()))?
        .args([
            "-i",
            input_path.to_str().unwrap(),
            "-vf",
            &format!("scale={}:{}", width, height),
            "-c:a",
            "copy",
            "-y",
            "-progress",
            "pipe:1",
            output_path.to_str().unwrap(),
        ]);

    let (mut rx, _) = cmd
        .spawn()
        .map_err(|e| crate::error::CommandError::FFmpegError(e.to_string()))?;

    let total_us = (total_duration_sec * 1_000_000.0) as u64;

    while let Some(event) = rx.recv().await {
        match event {
            CommandEvent::Terminated(payload) => {
                if let Some(code) = payload.code {
                    if code != 0 {
                        return Err(crate::error::CommandError::FFmpegError(format!(
                            "FFmpeg process exited with code {}",
                            code
                        )));
                    }
                }
            }
            CommandEvent::Error(err) => return Err(crate::error::CommandError::FFmpegError(err)),
            CommandEvent::Stdout(line) => {
                let line_str = String::from_utf8_lossy(&line);
                for l in line_str.lines() {
                    if let Some(us) = parse_progress(l) {
                        if total_us > 0 {
                            let percent = (us as f64 / total_us as f64) * 100.0;
                            let percent = if percent > 100.0 { 100.0 } else { percent };
                            window
                                .emit(
                                    "progress",
                                    ProgressPayload {
                                        progress: percent,
                                        status: "processing".to_string(),
                                    },
                                )
                                .unwrap_or(());
                        }
                    }
                }
            }
            _ => {}
        }
    }

    Ok(output)
}

pub async fn merge(
    inputs: Vec<String>,
    output: String,
    total_duration_sec: f64,
    window: tauri::Window,
) -> CommandResult<String> {
    if inputs.is_empty() {
        return Err(crate::error::CommandError::Unknown(
            "No input files provided".to_string(),
        ));
    }

    let first_input = PathBuf::from(&inputs[0]);
    let parent = first_input.parent().unwrap();
    let list_path = parent.join("concats.txt");

    {
        use std::io::Write;
        let mut file =
            std::fs::File::create(&list_path).map_err(crate::error::CommandError::IoError)?;
        for input in &inputs {
            let line = format!("file '{}'\n", input.replace('\\', "/"));
            file.write_all(line.as_bytes())
                .map_err(crate::error::CommandError::IoError)?;
        }
    }

    let cmd = window
        .shell()
        .sidecar("ffmpeg")
        .map_err(|e| crate::error::CommandError::FFmpegError(e.to_string()))?
        .args([
            "-f",
            "concat",
            "-safe",
            "0",
            "-i",
            list_path.to_str().unwrap(),
            "-c",
            "copy",
            "-y",
            "-progress",
            "pipe:1",
            &output,
        ]);

    let (mut rx, _) = cmd
        .spawn()
        .map_err(|e| crate::error::CommandError::FFmpegError(e.to_string()))?;

    let total_us = (total_duration_sec * 1_000_000.0) as u64;

    while let Some(event) = rx.recv().await {
        match event {
            CommandEvent::Terminated(payload) => {
                if let Some(code) = payload.code {
                    if code != 0 {
                        return Err(crate::error::CommandError::FFmpegError(format!(
                            "FFmpeg process exited with code {}",
                            code
                        )));
                    }
                }
            }
            CommandEvent::Error(err) => return Err(crate::error::CommandError::FFmpegError(err)),
            CommandEvent::Stdout(line) => {
                let line_str = String::from_utf8_lossy(&line);
                for l in line_str.lines() {
                    if let Some(us) = parse_progress(l) {
                        if total_us > 0 {
                            let percent = (us as f64 / total_us as f64) * 100.0;
                            let percent = if percent > 100.0 { 100.0 } else { percent };
                            window
                                .emit(
                                    "progress",
                                    ProgressPayload {
                                        progress: percent,
                                        status: "processing".to_string(),
                                    },
                                )
                                .unwrap_or(());
                        }
                    }
                }
            }
            _ => {}
        }
    }

    let _ = std::fs::remove_file(list_path);

    Ok(output)
}
