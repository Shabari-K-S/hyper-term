use portable_pty::{CommandBuilder, native_pty_system, PtySize};
use tauri::{Emitter, Manager};
use std::collections::HashMap;
use std::sync::{Arc, Mutex};
use std::io::{Read, Write};
use std::thread;

// Store multiple PTY writers, identified by a String ID
struct AppState {
    sessions: Arc<Mutex<HashMap<String, Box<dyn Write + Send>>>>,
}

#[tauri::command]
fn create_pty_session(id: String, state: tauri::State<AppState>, app_handle: tauri::AppHandle) {
    // 1. LOCK THE STATE
    let mut sessions = state.sessions.lock().unwrap();

    // 2. CHECK IF SESSION EXISTS
    if sessions.contains_key(&id) {
        // If it exists, do nothing! Just let the frontend connect to the existing one.
        return; 
    }

    // 3. IF NOT, CREATE NEW PTY
    let pty_system = native_pty_system();
    let pair = pty_system.openpty(PtySize { rows: 24, cols: 80, pixel_width: 0, pixel_height: 0 }).unwrap();

    let cmd = CommandBuilder::new(if cfg!(target_os = "windows") { "powershell" } else { "bash" });
    let mut _child = pair.slave.spawn_command(cmd).unwrap();

    // Store the writer
    let writer = pair.master.take_writer().unwrap();
    sessions.insert(id.clone(), writer); // Insert into the locked map

    // Spawn the reader thread
    let mut reader = pair.master.try_clone_reader().unwrap();
    let event_name = format!("pty-data-{}", id);
    
    thread::spawn(move || {
        let mut buffer = [0u8; 1024];
        loop {
            match reader.read(&mut buffer) {
                Ok(n) if n > 0 => {
                    let data = String::from_utf8_lossy(&buffer[..n]).to_string();
                    app_handle.emit(&event_name, data).unwrap(); 
                }
                _ => break,
            }
        }
    });
}

#[tauri::command]
fn write_to_pty(id: String, data: String, state: tauri::State<AppState>) {
    // Find the specific session and write to it
    let mut sessions = state.sessions.lock().unwrap();
    if let Some(writer) = sessions.get_mut(&id) {
        write!(writer, "{}", data).unwrap();
    }
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        // Initialize the container for sessions
        .manage(AppState { sessions: Arc::new(Mutex::new(HashMap::new())) }) 
        .invoke_handler(tauri::generate_handler![create_pty_session, write_to_pty])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}