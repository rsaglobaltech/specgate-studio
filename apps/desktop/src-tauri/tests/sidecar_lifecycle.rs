//! draft-desktop REQ-151 SCN-452 — closing a window ends its sidecar and
//! every process the sidecar started: a process group on macOS and Linux, a
//! Job object on Windows. The sidecar here is a stand-in that starts a child
//! that would run for five minutes, writes its pid, and says it is ready.

use specgate_studio_desktop::sidecar::{Line, Sidecar, GRACE};
use std::ffi::OsString;
use std::path::{Path, PathBuf};
use std::time::{Duration, Instant};

fn scratch(name: &str) -> PathBuf {
    let dir = std::env::temp_dir().join(format!(
        "sg-desktop-{name}-{}-{}",
        std::process::id(),
        Instant::now().elapsed().as_nanos()
    ));
    std::fs::create_dir_all(&dir).unwrap();
    dir
}

#[cfg(unix)]
fn stand_in(pid_file: &Path, ignore_term: bool) -> (PathBuf, Vec<OsString>) {
    let trap = if ignore_term { "trap '' TERM;" } else { "" };
    let script = format!(
        "{trap} sleep 300 & echo $! > '{}'; echo '{{\"type\":\"choose\",\"recent\":[]}}'; wait",
        pid_file.display()
    );
    (PathBuf::from("/bin/sh"), vec!["-c".into(), script.into()])
}

#[cfg(windows)]
fn stand_in(pid_file: &Path, _ignore_term: bool) -> (PathBuf, Vec<OsString>) {
    let script = format!(
        "$p = Start-Process -FilePath ping.exe -ArgumentList '-n','300','127.0.0.1' -WindowStyle Hidden -PassThru; \
         Set-Content -Path '{}' -Value $p.Id; \
         Write-Output '{{\"type\":\"choose\",\"recent\":[]}}'; Start-Sleep -Seconds 300",
        pid_file.display()
    );
    (
        PathBuf::from("powershell.exe"),
        vec!["-NoProfile".into(), "-Command".into(), script.into()],
    )
}

fn read_pid(file: &Path) -> u32 {
    let end = Instant::now() + Duration::from_secs(20);
    loop {
        if let Ok(t) = std::fs::read_to_string(file) {
            if let Ok(pid) = t.trim().parse() {
                return pid;
            }
        }
        assert!(Instant::now() < end, "the stand-in wrote no pid");
        std::thread::sleep(Duration::from_millis(50));
    }
}

#[cfg(unix)]
fn alive(pid: u32) -> bool {
    // A zombie is gone for this purpose: `ps` says its state.
    let out = std::process::Command::new("ps")
        .args(["-o", "stat=", "-p", &pid.to_string()])
        .output()
        .unwrap();
    let stat = String::from_utf8_lossy(&out.stdout);
    let stat = stat.trim();
    !stat.is_empty() && !stat.starts_with('Z')
}

#[cfg(windows)]
fn alive(pid: u32) -> bool {
    let out = std::process::Command::new("tasklist")
        .args(["/FI", &format!("PID eq {pid}"), "/NH"])
        .output()
        .unwrap();
    String::from_utf8_lossy(&out.stdout).contains(&pid.to_string())
}

fn gone_within(pid: u32, wait: Duration) -> bool {
    let end = Instant::now() + wait;
    while Instant::now() < end {
        if !alive(pid) {
            return true;
        }
        std::thread::sleep(Duration::from_millis(50));
    }
    !alive(pid)
}

#[test]
fn req_151_scn_452_ending_the_sidecar_ends_every_process_it_started() {
    let dir = scratch("tree");
    let pid_file = dir.join("child.pid");
    let (program, args) = stand_in(&pid_file, false);
    let (mut sidecar, line) = Sidecar::spawn(&program, &args, Duration::from_secs(30)).unwrap();
    assert_eq!(line, Line::Choose { recent: vec![] });
    let child = read_pid(&pid_file);
    assert!(alive(child), "the sidecar's child runs");
    let parent = sidecar.pid();
    sidecar.end();
    assert!(!sidecar.running());
    assert!(
        gone_within(child, Duration::from_secs(10)),
        "child {child} of {parent} still runs"
    );
    let _ = std::fs::remove_dir_all(dir);
}

#[test]
fn req_151_scn_452_dropping_the_sidecar_when_its_window_closes_ends_its_tree() {
    let dir = scratch("drop");
    let pid_file = dir.join("child.pid");
    let (program, args) = stand_in(&pid_file, false);
    let (sidecar, _) = Sidecar::spawn(&program, &args, Duration::from_secs(30)).unwrap();
    let child = read_pid(&pid_file);
    drop(sidecar);
    assert!(
        gone_within(child, Duration::from_secs(10)),
        "child {child} still runs"
    );
    let _ = std::fs::remove_dir_all(dir);
}

#[cfg(unix)]
#[test]
fn req_151_scn_452_a_sidecar_that_ignores_the_request_is_killed_after_the_grace_period() {
    let dir = scratch("stubborn");
    let pid_file = dir.join("child.pid");
    let (program, args) = stand_in(&pid_file, true);
    let (mut sidecar, _) = Sidecar::spawn(&program, &args, Duration::from_secs(30)).unwrap();
    let child = read_pid(&pid_file);
    let start = Instant::now();
    sidecar.end();
    assert!(start.elapsed() >= GRACE - Duration::from_millis(100));
    assert!(
        gone_within(child, Duration::from_secs(5)),
        "child {child} still runs"
    );
    let _ = std::fs::remove_dir_all(dir);
}

#[test]
fn req_151_a_sidecar_that_never_says_it_is_ready_is_ended() {
    #[cfg(unix)]
    let (program, args): (PathBuf, Vec<OsString>) = (
        PathBuf::from("/bin/sh"),
        vec!["-c".into(), "sleep 300".into()],
    );
    #[cfg(windows)]
    let (program, args): (PathBuf, Vec<OsString>) = (
        PathBuf::from("powershell.exe"),
        vec![
            "-NoProfile".into(),
            "-Command".into(),
            "Start-Sleep -Seconds 300".into(),
        ],
    );
    let started = Sidecar::spawn(&program, &args, Duration::from_millis(500));
    assert!(started.is_err());
}
