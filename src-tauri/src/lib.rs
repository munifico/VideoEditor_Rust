pub mod error;
pub mod ffmpeg;

use error::CommandResult;

#[tauri::command]
async fn trim_video(
    window: tauri::Window,
    input: String,
    start: f64,
    duration: f64,
    index: Option<usize>,
) -> CommandResult<String> {
    // ensure input has an extension
    let path = std::path::Path::new(&input);
    let stem = path.file_stem().unwrap().to_str().unwrap();
    let extension = path.extension().unwrap().to_str().unwrap();
    let parent = path.parent().unwrap();

    let suffix = match index {
        Some(i) => format!("_part{}", i),
        None => "_trimmed".to_string(),
    };

    let output = parent
        .join(format!("{}{}.{}", stem, suffix, extension))
        .to_str()
        .unwrap()
        .to_string();

    ffmpeg::trim(input, output, start, duration, window).await
}

#[tauri::command]
async fn resize_video(
    window: tauri::Window,
    input: String,
    width: u32,
    height: u32,
    total_duration: f64,
    output_path: Option<String>,
) -> CommandResult<String> {
    let output = if let Some(path) = output_path {
        path
    } else {
        let path = std::path::Path::new(&input);
        let stem = path.file_stem().unwrap().to_str().unwrap();
        let extension = path.extension().unwrap().to_str().unwrap();
        let parent = path.parent().unwrap();
        parent
            .join(format!("{}_resized_{}x{}.{}", stem, width, height, extension))
            .to_str()
            .unwrap()
            .to_string()
    };

    ffmpeg::resize(input, output, width, height, total_duration, window).await
}

#[tauri::command]
async fn merge_videos(
    window: tauri::Window,
    inputs: Vec<String>,
    total_duration: f64,
) -> CommandResult<String> {
    if inputs.is_empty() {
        return Err(crate::error::CommandError::Unknown(
            "No input files selected".to_string(),
        ));
    }

    let first_path = std::path::Path::new(&inputs[0]);
    let parent = first_path.parent().unwrap();
    
    // Simple timestamp for unique filename
    let timestamp = std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .unwrap()
        .as_secs();
        
    let output = parent
        .join(format!("merged_{}.mp4", timestamp))
        .to_str()
        .unwrap()
        .to_string();

    ffmpeg::merge(inputs, output, total_duration, window).await
}

#[tauri::command]
async fn delete_files(files: Vec<String>) -> Result<(), String> {
    for file in files {
        // We ignore errors for individual files to ensure we try to delete all
        let _ = std::fs::remove_file(file);
    }
    Ok(())
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_fs::init())
        .invoke_handler(tauri::generate_handler![trim_video, resize_video, merge_videos, delete_files])
        .setup(|app| {
            if cfg!(debug_assertions) {
                app.handle().plugin(
                    tauri_plugin_log::Builder::default()
                        .level(log::LevelFilter::Info)
                        .build(),
                )?;
            }
            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
