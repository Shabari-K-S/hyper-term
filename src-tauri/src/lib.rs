use portable_pty::{native_pty_system, CommandBuilder, MasterPty, PtySize};
use std::collections::HashMap;
use std::io::{Read, Write};
use std::sync::{Arc, Mutex};
use std::thread;
use tauri::Emitter;

// 1. New Struct to hold both the resize capability (master) and write capability (writer)
struct PtySession {
    master: Box<dyn MasterPty + Send>,
    writer: Box<dyn Write + Send>,
}

struct AppState {
    sessions: Arc<Mutex<HashMap<String, PtySession>>>,
}

#[tauri::command]
fn create_pty_session(
    id: String,
    command: Option<String>,
    args: Option<Vec<String>>,
    state: tauri::State<AppState>,
    app_handle: tauri::AppHandle,
) {
    let mut sessions = state.sessions.lock().unwrap();
    if sessions.contains_key(&id) {
        return;
    }

    let pty_system = native_pty_system();
    // Start with a default size
    let pair = pty_system
        .openpty(PtySize {
            rows: 24,
            cols: 80,
            pixel_width: 0,
            pixel_height: 0,
        })
        .unwrap();

    // Destructure to separate master and slave
    let mut master = pair.master;
    let slave = pair.slave;

    let cmd_str = command.unwrap_or_else(|| {
        if cfg!(target_os = "windows") {
            "cmd.exe".to_string()
        } else {
            std::env::var("SHELL").unwrap_or("bash".to_string())
        }
    });
    let mut cmd = CommandBuilder::new(cmd_str.clone());

    if let Some(arguments) = args {
        cmd.args(arguments);
    }

    let mut _child = match slave.spawn_command(cmd) {
        Ok(child) => child,
        Err(e) => {
            println!("Failed to spawn command '{}': {}", cmd_str, e);
            // Optionally emit an error event to frontend
            let _ = app_handle.emit(&format!("pty-exit-{}", id), ());
            return;
        }
    };

    // 2. Spawn Reader Thread
    let mut reader = master.try_clone_reader().unwrap();
    let data_event = format!("pty-data-{}", id);
    let exit_event = format!("pty-exit-{}", id);

    thread::spawn(move || {
        let mut buffer = [0u8; 1024];
        loop {
            match reader.read(&mut buffer) {
                Ok(n) if n > 0 => {
                    let data = String::from_utf8_lossy(&buffer[..n]).to_string();
                    app_handle.emit(&data_event, data).unwrap();
                }
                _ => {
                    app_handle.emit(&exit_event, ()).unwrap();
                    break;
                }
            }
        }
    });

    // 3. Take the writer ONCE here
    let writer = master.take_writer().unwrap();

    // 4. Store master in our new struct (slave is dropped here, which is key for EOF)
    sessions.insert(id, PtySession { master, writer });
}

#[tauri::command]
fn write_to_pty(id: String, data: String, state: tauri::State<AppState>) {
    let mut sessions = state.sessions.lock().unwrap();
    // Use the stored writer directly
    if let Some(session) = sessions.get_mut(&id) {
        write!(session.writer, "{}", data).unwrap();
    }
}

#[tauri::command]
fn resize_pty(id: String, rows: u16, cols: u16, state: tauri::State<AppState>) {
    let sessions = state.sessions.lock().unwrap();
    // Use the stored master for resizing
    if let Some(session) = sessions.get(&id) {
        session
            .master
            .resize(PtySize {
                rows,
                cols,
                pixel_width: 0,
                pixel_height: 0,
            })
            .unwrap();
    }
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_clipboard_manager::init())
        .plugin(tauri_plugin_store::Builder::default().build())
        .manage(AppState {
            sessions: Arc::new(Mutex::new(HashMap::new())),
        })
        .invoke_handler(tauri::generate_handler![
            create_pty_session,
            write_to_pty,
            resize_pty
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
