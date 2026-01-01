
# 🚀 Hyper Term (Tauri + React)

A modern, GPU-accelerated terminal emulator built with **Rust (Tauri)** and **React**.
Designed to be lightweight, incredibly fast, and aesthetically pleasing with a "Ghostty-style" translucent UI.

![Terminal Preview](./docs/preview.png)

## ✨ Features

* **⚡ Blazing Fast:** Powered by Rust and `portable-pty` for the backend, with `xterm.js` WebGL rendering on the frontend.
* **🎨 Modern UI:** Sleek, borderless design with a custom title bar.
* **🔀 Multi-Tab & Split Support:** Manage multiple sessions effortlessly.
* **📁 Profile Manager:** Built-in sidebar to manage SSH connections, WSL distros, and local shells.
* **🧩 Nerd Font Support:** Bundled JetBrains Mono Nerd Font for perfect icon rendering (Starship/Powerlevel10k ready).
* **🛠️ Cross-Platform:** Runs natively on Linux, Windows, and macOS.

---

## 🛠️ Tech Stack

* **Frontend:** React 19, TypeScript, TailwindCSS (optional), Framer Motion.
* **Backend:** Rust, Tauri v2.
* **Terminal Engine:** xterm.js + xterm-addon-fit + xterm-addon-web-links.
* **Shell Interface:** portable-pty (async multi-threaded shell management).

---

## 🚀 Getting Started

### Prerequisites

Ensure you have the following installed:
1.  **Rust & Cargo:** `curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh`
2.  **Node.js & npm:** v18 or higher.
3.  **System Dependencies:**
    * *Linux:* `libwebkit2gtk-4.0-dev`, `build-essential`, `libssl-dev`, `libgtk-3-dev`, `libayatana-appindicator3-dev`.
    * *Windows/Mac:* No extra steps usually needed.

### Installation

1.  **Clone the repository:**
    ```bash
    git clone https://github.com/Shabari-K-S/hyper-term.git
    cd hyper-term
    ```

2.  **Install Frontend Dependencies:**
    ```bash
    npm install
    ```

3.  **Run in Development Mode:**
    This starts the React server and the Rust backend simultaneously.
    ```bash
    npm run tauri dev
    ```

---

## 📖 Usage Guide

### 1. SSH & Profiles
Click the **Menu Icon** (Hamburger) in the top-left to open the **Sidebar**.
* **Local:** Spawns your default shell (Bash/Zsh/PowerShell).
* **WSL:** Automatically detects and launches WSL (Windows only).
* **SSH:** Click "New Connection" to add a saved SSH profile (e.g., `root@192.168.1.5`).

### 2. Tabs
* Click the **`+`** button in the tab bar to open a new session.
* Close tabs using the **`x`** icon on the tab itself.

### 3. Font Issues?
If you see "boxes" instead of icons in your prompt:
* The app comes bundled with **JetBrains Mono Nerd Font**.
* Ensure the file exists in `src/assets/fonts/`.
* If developing on Linux, you may need to install the font system-wide if the CSS bundling fails: `sudo pacman -S ttf-jetbrains-mono-nerd`.

---

## 🔧 Configuration

### Customizing the Shell
To change the default shell (e.g., from Bash to Zsh), edit `src-tauri/src/lib.rs`:

```rust
// In lib.rs
let cmd = CommandBuilder::new("zsh"); // Change "bash" to "zsh" or "fish"

```

### Changing Colors

The theme is hardcoded for seamless integration in `src/components/Terminal.tsx`.
To change the background color, you must update it in **two places** to ensure the seamless look:

1. `src/App.css` -> `.app-container { background-color: #YOUR_COLOR; }`
2. `src/components/Terminal.tsx` -> `const theme = { background: '#YOUR_COLOR', ... }`

---

## 🤝 Contributing

Pull requests are welcome!

1. Fork the repo.
2. Create your feature branch (`git checkout -b feature/AmazingFeature`).
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`).
4. Push to the branch (`git push origin feature/AmazingFeature`).
5. Open a Pull Request.

---

## ❤️ Credits

Built with **love** and:
* [![Tauri](https://img.shields.io/badge/Tauri-FFC131?style=flat-square&logo=tauri&logoColor=black)](https://tauri.app)
* [![React](https://img.shields.io/badge/React-20232A?style=flat-square&logo=react&logoColor=61DAFB)](https://react.dev)
* [![Rust](https://img.shields.io/badge/Rust-000000?style=flat-square&logo=rust&logoColor=white)](https://www.rust-lang.org/)

Made by **[Shabari K S](https://github.com/Shabari-K-S)** 🚀
