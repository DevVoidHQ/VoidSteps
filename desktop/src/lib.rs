#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    let builder = tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_window_state::Builder::default().build());

    // The update check is the app's only network call, and it lives on the
    // Rust side, so the webview's CSP stays closed to every origin.
    #[cfg(desktop)]
    let builder = builder
        .plugin(tauri_plugin_updater::Builder::new().build())
        .plugin(tauri_plugin_process::init());

    builder
        .run(tauri::generate_context!())
        .expect("error while running VoidSteps");
}
