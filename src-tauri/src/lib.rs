#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_log::Builder::default().build())
        .plugin(tauri_plugin_os::init())
        .plugin(tauri_plugin_keyring_store::init())
        .plugin(tauri_plugin_window_state::Builder::default().build())
        .plugin(tauri_plugin_opener::init())
        .setup(|app| {
            use tauri::{Listener, Manager};
            let window = app.get_webview_window("main").expect("main window");

            let (shell_ready_tx, shell_ready_rx) = std::sync::mpsc::channel::<()>();
            let _ = app.listen("push:shell-ready", move |_| {
                let _ = shell_ready_tx.send(());
            });

            std::thread::spawn(move || {
                let show_after = std::time::Duration::from_secs(5);
                if shell_ready_rx.recv_timeout(show_after).is_err() {
                    let _ = window.show();
                }
            });

            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}