//! Specgate Studio's desktop shell (draft-desktop, ADR-0001, ADR-0002): a
//! Tauri 2 window per project, each over the project's core host, run as a
//! sidecar by the Node the app ships. The window loads the same UI the browser
//! gets from that host; the shell holds no business rule — which host serves a
//! project, and whether an update may install, are the host's answers.

pub mod session;
pub mod sidecar;
pub mod update;
pub mod windows;

use sidecar::{Line, Recent, Sidecar};
use std::collections::HashMap;
use std::ffi::OsString;
use std::path::{Path, PathBuf};
use std::sync::Mutex;
use std::time::Duration;
use tauri::menu::{Menu, MenuBuilder, MenuItemBuilder, PredefinedMenuItem, SubmenuBuilder};
use tauri::{AppHandle, Manager, RunEvent, WebviewUrl, WebviewWindowBuilder, WindowEvent, Wry};
use tauri_plugin_dialog::{DialogExt, MessageDialogButtons, MessageDialogKind};
use tauri_plugin_updater::UpdaterExt;
use windows::{Opening, ProjectWindows};

/// How long a sidecar may take to say it is ready.
const READY_WAIT: Duration = Duration::from_secs(30);

#[derive(Default)]
struct Studio {
    windows: ProjectWindows,
    /// The sidecar of each window whose host it started; a window that joined
    /// another process's host (`specgate-studio serve`) has none.
    sidecars: HashMap<String, Sidecar>,
    /// Each window's host address and its session token, for the update's questions.
    hosts: HashMap<String, (String, String)>,
    recent: Vec<Recent>,
    /// Windows only: an update downloaded and verified, installed as the studio quits.
    pending_update: Option<(tauri_plugin_updater::Update, Vec<u8>)>,
}

type State = Mutex<Studio>;

/// The Node the app ships, beside the shell's own executable.
fn node_program() -> PathBuf {
    let exe = std::env::current_exe().unwrap_or_default();
    let dir = exe.parent().map(Path::to_path_buf).unwrap_or_default();
    dir.join(if cfg!(windows) {
        "studio-node.exe"
    } else {
        "studio-node"
    })
}

/// The bundled host, among the app's resources.
fn sidecar_script(app: &AppHandle) -> PathBuf {
    app.path()
        .resource_dir()
        .unwrap_or_default()
        .join("host")
        .join("sidecar.mjs")
}

fn lang() -> &'static str {
    let l = std::env::var("LC_ALL")
        .or_else(|_| std::env::var("LANG"))
        .unwrap_or_default();
    if l.starts_with("es") {
        "es"
    } else {
        "en"
    }
}

/// Opens `folder` — or, with none, the most recent project — in its window.
fn open_project(app: &AppHandle, folder: Option<PathBuf>) {
    let mut args: Vec<OsString> = vec![sidecar_script(app).into_os_string()];
    if let Some(f) = &folder {
        args.push("--project-dir".into());
        args.push(f.clone().into_os_string());
    }
    args.push("--exit-with-stdin".into());
    // A new secret for this sidecar, in its environment: the host answers only to it (A2).
    let own_token = session::new_token();
    let envs = [(session::TOKEN_ENV, own_token.as_str())];
    let (sidecar, line) = match Sidecar::spawn(&node_program(), &args, &envs, READY_WAIT) {
        Ok(s) => s,
        Err(e) => return failed(app, &format!("The studio's host did not start: {e}")),
    };
    match line {
        Line::Choose { recent } => {
            drop(sidecar);
            set_recent(app, recent);
            choose_folder(app);
        }
        Line::Error { message } => {
            drop(sidecar);
            failed(app, &format!("The studio's host did not start: {message}"));
        }
        Line::Ready {
            url,
            token,
            key,
            project_dir,
            owned,
            recent,
        } => {
            set_recent(app, recent);
            let state = app.state::<State>();
            let opening = state.lock().unwrap().windows.open(&key);
            match opening {
                Opening::Focus(label) => {
                    // Already open: its window comes to the front; the new sidecar joined and ends.
                    drop(sidecar);
                    if let Some(w) = app.get_webview_window(&label) {
                        let _ = w.unminimize();
                        let _ = w.show();
                        let _ = w.set_focus();
                    }
                }
                Opening::Create(label) => {
                    // A host this sidecar joined issued the window a token of its own.
                    let token = token.unwrap_or(own_token);
                    let name = Path::new(&project_dir)
                        .file_name()
                        .map(|n| n.to_string_lossy().into_owned())
                        .unwrap_or_else(|| project_dir.clone());
                    let parsed = match session::window_url(&url, &token).parse::<tauri::Url>() {
                        Ok(u) => u,
                        Err(e) => {
                            state.lock().unwrap().windows.closed(&label);
                            return failed(app, &format!("The host's address is not valid: {e}"));
                        }
                    };
                    let built =
                        WebviewWindowBuilder::new(app, &label, WebviewUrl::External(parsed))
                            .title(format!("{name} — Specgate Studio"))
                            .inner_size(1280.0, 800.0)
                            .min_inner_size(720.0, 480.0)
                            .build();
                    if let Err(e) = built {
                        state.lock().unwrap().windows.closed(&label);
                        return failed(app, &format!("The window did not open: {e}"));
                    }
                    let mut studio = state.lock().unwrap();
                    studio.hosts.insert(label.clone(), (url, token));
                    if owned {
                        studio.sidecars.insert(label, sidecar);
                    }
                }
            }
        }
    }
}

fn failed(app: &AppHandle, message: &str) {
    eprintln!("specgate-studio: {message}");
    app.dialog()
        .message(message)
        .title("Specgate Studio")
        .kind(MessageDialogKind::Error)
        .blocking_show();
    if app.state::<State>().lock().unwrap().windows.is_empty() {
        app.exit(1);
    }
}

fn choose_folder(app: &AppHandle) {
    let picked = app
        .dialog()
        .file()
        .set_title("Open a project folder")
        .blocking_pick_folder();
    match picked.and_then(|p| p.into_path().ok()) {
        Some(dir) => open_project(app, Some(dir)),
        None => {
            if app.state::<State>().lock().unwrap().windows.is_empty() {
                app.exit(0);
            }
        }
    }
}

fn set_recent(app: &AppHandle, recent: Vec<Recent>) {
    app.state::<State>().lock().unwrap().recent = recent.clone();
    match menu(app, &recent) {
        Ok(m) => {
            let _ = app.set_menu(m);
        }
        Err(e) => eprintln!("specgate-studio: no menu: {e}"),
    }
}

fn menu(app: &AppHandle, recent: &[Recent]) -> tauri::Result<Menu<Wry>> {
    let mut open_recent = SubmenuBuilder::new(app, "Open Recent");
    if recent.is_empty() {
        open_recent = open_recent.item(
            &MenuItemBuilder::with_id("recent-none", "No recent projects")
                .enabled(false)
                .build(app)?,
        );
    }
    for (i, r) in recent.iter().enumerate() {
        open_recent = open_recent.item(
            &MenuItemBuilder::with_id(format!("recent:{i}"), format!("{} — {}", r.name, r.path))
                .build(app)?,
        );
    }
    let file = SubmenuBuilder::new(app, "File")
        .item(
            &MenuItemBuilder::with_id("open-folder", "Open Folder…")
                .accelerator("CmdOrCtrl+O")
                .build(app)?,
        )
        .item(&open_recent.build()?)
        .separator()
        .item(&PredefinedMenuItem::close_window(app, None)?);
    #[cfg(not(target_os = "macos"))]
    let file = file.separator().item(&PredefinedMenuItem::quit(app, None)?);
    let edit = SubmenuBuilder::new(app, "Edit")
        .undo()
        .redo()
        .separator()
        .cut()
        .copy()
        .paste()
        .select_all()
        .build()?;
    let window = SubmenuBuilder::new(app, "Window")
        .minimize()
        .item(&PredefinedMenuItem::fullscreen(app, None)?)
        .build()?;
    #[allow(unused_mut)]
    let mut bar = MenuBuilder::new(app);
    #[cfg(target_os = "macos")]
    {
        let about = SubmenuBuilder::new(app, "Specgate Studio")
            .about(None)
            .separator()
            .services()
            .separator()
            .hide()
            .hide_others()
            .show_all()
            .separator()
            .quit()
            .build()?;
        bar = bar.item(&about);
    }
    bar.item(&file.build()?).item(&edit).item(&window).build()
}

fn on_menu(app: &AppHandle, id: &str) {
    let app = app.clone();
    if id == "open-folder" {
        std::thread::spawn(move || choose_folder(&app));
    } else if let Some(i) = id
        .strip_prefix("recent:")
        .and_then(|i| i.parse::<usize>().ok())
    {
        let path = app
            .state::<State>()
            .lock()
            .unwrap()
            .recent
            .get(i)
            .map(|r| PathBuf::from(&r.path));
        if let Some(p) = path {
            std::thread::spawn(move || open_project(&app, Some(p)));
        }
    }
}

/// A window closed: its project is closed, and its sidecar ends with every process it started.
fn window_closed(app: &AppHandle, label: &str) {
    let sidecar = {
        let state = app.state::<State>();
        let mut studio = state.lock().unwrap();
        studio.windows.closed(label);
        studio.hosts.remove(label);
        studio.sidecars.remove(label)
    };
    if let Some(mut s) = sidecar {
        // Told at once; waited for, and killed if need be, off the event loop.
        s.signal_end();
        std::thread::spawn(move || drop(s));
    }
}

/// Every sidecar left ends before the studio does.
fn end_all(app: &AppHandle) {
    let mut all: Vec<Sidecar> = {
        let state = app.state::<State>();
        let mut studio = state.lock().unwrap();
        studio.sidecars.drain().map(|(_, s)| s).collect()
    };
    for s in all.iter_mut() {
        s.signal_end();
    }
    for mut s in all {
        s.end();
    }
}

/// One step of the update, asked of every open project's host.
fn ask_hosts(app: &AppHandle, step: &[String]) -> Vec<update::Decision> {
    let hosts: Vec<(String, String)> = app
        .state::<State>()
        .lock()
        .unwrap()
        .hosts
        .values()
        .cloned()
        .collect();
    let mut answers = Vec::new();
    for (url, token) in hosts {
        let mut args: Vec<OsString> = vec![
            sidecar_script(app).into_os_string(),
            "update-step".into(),
            "--url".into(),
            url.into(),
        ];
        args.extend(step.iter().map(OsString::from));
        match sidecar::ask(&node_program(), &args, &[(session::TOKEN_ENV, &token)])
            .and_then(|v| serde_json::from_value(v).map_err(std::io::Error::other))
        {
            Ok(d) => answers.push(d),
            Err(e) => eprintln!("specgate-studio: the host did not answer the update: {e}"),
        }
    }
    answers
}

fn notice(d: &update::Decision) -> String {
    if lang() == "es" {
        d.notice.es.clone()
    } else {
        d.notice.en.clone()
    }
}

fn say(app: &AppHandle, d: &update::Decision) {
    app.dialog()
        .message(notice(d))
        .title("Specgate Studio update")
        .kind(MessageDialogKind::Info)
        .blocking_show();
}

/// Checks for a newer release once the first window is open, and offers it.
fn check_for_update(app: AppHandle) {
    let configured = app
        .config()
        .plugins
        .0
        .get("updater")
        .and_then(|u| u.get("pubkey"))
        .and_then(|k| k.as_str())
        .is_some_and(|k| k != update::PLACEHOLDER_PUBKEY);
    if !configured {
        eprintln!("specgate-studio: no updater key configured; updates are not checked");
        return;
    }
    tauri::async_runtime::spawn(async move {
        // The first window first: the update never delays opening the project.
        while app.state::<State>().lock().unwrap().hosts.is_empty() {
            tokio::time::sleep(Duration::from_millis(500)).await;
        }
        let checked = match app.updater() {
            Ok(u) => u.check().await,
            Err(e) => Err(e),
        };
        let update = match checked {
            Ok(Some(u)) => u,
            Ok(None) => return,
            Err(e) => return eprintln!("specgate-studio: no update check: {e}"),
        };
        let (from, to) = (update.current_version.clone(), update.version.clone());
        let step = |phase: &str| -> Vec<String> {
            ["--phase", phase, "--from", &from, "--to", &to]
                .iter()
                .map(|s| s.to_string())
                .collect()
        };
        let Some(offer) = ask_hosts(&app, &step("offered")).into_iter().next() else {
            return;
        };
        let accepted = app
            .dialog()
            .message(notice(&offer))
            .title("Specgate Studio update")
            .buttons(MessageDialogButtons::OkCancelCustom(
                "Install".into(),
                "Not now".into(),
            ))
            .blocking_show();
        if !accepted {
            return; // Offered again on the next start.
        }
        // Never during a build or a write command, in any open project.
        let mut told = false;
        while let Err(wait) = update::all_allow(&ask_hosts(&app, &step("accepted"))) {
            if !told {
                say(&app, &wait);
                told = true;
            }
            tokio::time::sleep(update::RETRY).await;
        }
        let bytes = match update.download(|_, _| {}, || {}).await {
            Ok(b) => b,
            Err(e) => {
                let reason = match e {
                    tauri_plugin_updater::Error::Minisign(_)
                    | tauri_plugin_updater::Error::Base64(_)
                    | tauri_plugin_updater::Error::SignatureUtf8(_) => "signature",
                    _ => "download",
                };
                eprintln!("specgate-studio: update refused: {e}");
                let mut s = step("refused");
                s.extend(["--reason".to_string(), reason.to_string()]);
                if let Some(d) = ask_hosts(&app, &s).into_iter().next() {
                    say(&app, &d);
                }
                return;
            }
        };
        // Windows runs its installer and exits the app: there it installs as the studio quits.
        if cfg!(windows) {
            app.state::<State>().lock().unwrap().pending_update = Some((update, bytes));
        } else if let Err(e) = update.install(&bytes) {
            return eprintln!("specgate-studio: the update did not install: {e}");
        }
        if let Some(d) = ask_hosts(&app, &step("installed")).into_iter().next() {
            say(&app, &d);
        }
    });
}

/// The first folder named on the command line, if any.
fn folder_argument() -> Option<PathBuf> {
    std::env::args_os()
        .skip(1)
        .map(PathBuf::from)
        .find(|p| !p.to_string_lossy().starts_with('-') && p.is_dir())
}

pub fn run() {
    let app = tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_updater::Builder::new().build())
        .manage(State::default())
        .on_menu_event(|app, event| on_menu(app, event.id().as_ref()))
        .on_window_event(|window, event| {
            if let WindowEvent::Destroyed = event {
                window_closed(window.app_handle(), window.label());
            }
        })
        .setup(|app| {
            let handle = app.handle().clone();
            set_recent(&handle, Vec::new());
            let folder = folder_argument();
            std::thread::spawn(move || open_project(&handle, folder));
            check_for_update(app.handle().clone());
            Ok(())
        })
        .build(tauri::generate_context!())
        .expect("the studio's window could not start");
    app.run(|app, event| {
        if let RunEvent::Exit = event {
            end_all(app);
            let pending = app.state::<State>().lock().unwrap().pending_update.take();
            if let Some((update, bytes)) = pending {
                let _ = update.install(bytes);
            }
        }
    });
}
