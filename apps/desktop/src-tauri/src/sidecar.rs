//! The core host's sidecar (draft-desktop REQ-151): the Node the app ships,
//! running the bundled host for one project window. It is started in a
//! process group of its own on macOS and Linux, and inside a Job object on
//! Windows, so that ending it ends every process it started — a terminal's
//! shell, a build, the agent. Its input is held open: when it closes — the
//! window closed, or the shell itself died — the sidecar ends its host.

use serde::Deserialize;
use std::ffi::OsString;
use std::io::{self, BufRead, BufReader, Write};
use std::path::Path;
use std::process::{Child, ChildStdin, Command, Stdio};
use std::sync::mpsc;
use std::thread;
use std::time::{Duration, Instant};

/// A project the Developer opened lately, as the sidecar lists them.
#[derive(Debug, Clone, Deserialize, PartialEq, Eq)]
pub struct Recent {
    pub path: String,
    pub name: String,
}

/// The one line the sidecar prints once it is ready.
#[derive(Debug, Clone, Deserialize, PartialEq, Eq)]
#[serde(tag = "type", rename_all = "lowercase")]
pub enum Line {
    /// The project's host answers at `url`; `owned` when this sidecar started it.
    Ready {
        url: String,
        /// Only when it joined another process's host: the token that host issued for this window.
        #[serde(default)]
        token: Option<String>,
        key: String,
        #[serde(rename = "projectDir")]
        project_dir: String,
        owned: bool,
        recent: Vec<Recent>,
    },
    /// No folder given and none opened before: the shell asks for one.
    Choose { recent: Vec<Recent> },
    /// The sidecar could not start.
    Error { message: String },
}

/// How long the shell gives the sidecar to end its host before it is killed.
pub const GRACE: Duration = Duration::from_secs(3);

/// A running sidecar; ending it — or dropping it — ends its whole process tree.
pub struct Sidecar {
    child: Child,
    stdin: Option<ChildStdin>,
    #[cfg(windows)]
    job: job::Job,
    ended: bool,
}

impl Sidecar {
    /// Starts `program args…` as a sidecar, with `envs` added to its
    /// environment (its session token), and waits for its first line.
    pub fn spawn(
        program: &Path,
        args: &[OsString],
        envs: &[(&str, &str)],
        wait: Duration,
    ) -> io::Result<(Sidecar, Line)> {
        let mut command = Command::new(program);
        command
            .args(args)
            .envs(envs.iter().copied())
            .stdin(Stdio::piped())
            .stdout(Stdio::piped())
            .stderr(Stdio::inherit());
        #[cfg(unix)]
        {
            use std::os::unix::process::CommandExt;
            // Its own process group: the shell ends the group, not one process.
            command.process_group(0);
        }
        #[cfg(windows)]
        {
            use std::os::windows::process::CommandExt;
            const CREATE_NO_WINDOW: u32 = 0x0800_0000;
            command.creation_flags(CREATE_NO_WINDOW);
        }
        #[cfg(windows)]
        let job = job::Job::new()?;
        let mut child = command.spawn()?;
        #[cfg(windows)]
        if let Err(e) = job.assign(&child) {
            let _ = child.kill();
            return Err(e);
        }
        let stdin = child.stdin.take();
        let stdout = child.stdout.take().expect("piped stdout");
        let mut sidecar = Sidecar {
            child,
            stdin,
            #[cfg(windows)]
            job,
            ended: false,
        };
        // Its output is read to the end on a thread of its own, so its pipe never fills.
        let (tx, rx) = mpsc::channel::<String>();
        thread::spawn(move || {
            let mut reader = BufReader::new(stdout);
            let mut line = String::new();
            loop {
                line.clear();
                match reader.read_line(&mut line) {
                    Ok(0) | Err(_) => break,
                    Ok(_) => {
                        let _ = tx.send(line.trim_end().to_string());
                    }
                }
            }
        });
        let deadline = Instant::now() + wait;
        loop {
            let left = deadline.saturating_duration_since(Instant::now());
            match rx.recv_timeout(left) {
                Ok(text) if text.starts_with('{') => {
                    let parsed: Line = serde_json::from_str(&text)
                        .map_err(|e| io::Error::new(io::ErrorKind::InvalidData, e))?;
                    return Ok((sidecar, parsed));
                }
                Ok(_) => continue,
                Err(_) => {
                    sidecar.end();
                    return Err(io::Error::new(
                        io::ErrorKind::TimedOut,
                        "the sidecar did not say it was ready",
                    ));
                }
            }
        }
    }

    pub fn pid(&self) -> u32 {
        self.child.id()
    }

    /// Asks the sidecar to end, and returns at once: its input closed and, on
    /// macOS and Linux, its group told to terminate.
    pub fn signal_end(&mut self) {
        self.stdin.take();
        #[cfg(unix)]
        unsafe {
            libc::kill(-(self.child.id() as i32), libc::SIGTERM);
        }
    }

    /// Ends the sidecar and every process it started: asked first, then, after
    /// [`GRACE`], killed — its group on macOS and Linux, its Job on Windows.
    pub fn end(&mut self) {
        if self.ended {
            return;
        }
        self.signal_end();
        let deadline = Instant::now() + GRACE;
        while Instant::now() < deadline {
            if let Ok(Some(_)) = self.child.try_wait() {
                break;
            }
            thread::sleep(Duration::from_millis(25));
        }
        #[cfg(unix)]
        unsafe {
            // Whatever is left in its group, the sidecar included.
            libc::kill(-(self.child.id() as i32), libc::SIGKILL);
        }
        #[cfg(windows)]
        self.job.terminate();
        let _ = self.child.kill();
        let _ = self.child.wait();
        self.ended = true;
    }

    /// Whether the sidecar process itself still runs.
    pub fn running(&mut self) -> bool {
        matches!(self.child.try_wait(), Ok(None))
    }

    /// Writes a line to the sidecar's input (it ignores what it reads; tests use it).
    pub fn write_line(&mut self, text: &str) -> io::Result<()> {
        match self.stdin.as_mut() {
            Some(s) => writeln!(s, "{text}"),
            None => Err(io::Error::new(io::ErrorKind::BrokenPipe, "input closed")),
        }
    }
}

impl Drop for Sidecar {
    fn drop(&mut self) {
        self.end();
    }
}

/// Runs the sidecar program once for an answer — `update-step` — and parses its line.
pub fn ask(
    program: &Path,
    args: &[OsString],
    envs: &[(&str, &str)],
) -> io::Result<serde_json::Value> {
    let mut command = Command::new(program);
    command
        .args(args)
        .envs(envs.iter().copied())
        .stdin(Stdio::null())
        .stderr(Stdio::inherit());
    #[cfg(windows)]
    {
        use std::os::windows::process::CommandExt;
        command.creation_flags(0x0800_0000);
    }
    let out = command.output()?;
    let text = String::from_utf8_lossy(&out.stdout);
    let line = text
        .lines()
        .find(|l| l.starts_with('{'))
        .ok_or_else(|| io::Error::new(io::ErrorKind::InvalidData, "no answer"))?;
    serde_json::from_str(line).map_err(|e| io::Error::new(io::ErrorKind::InvalidData, e))
}

#[cfg(windows)]
mod job {
    //! A Job object that kills every process in it when it is closed or terminated.
    use std::io;
    use std::os::windows::io::AsRawHandle;
    use std::process::Child;
    use windows_sys::Win32::Foundation::{CloseHandle, HANDLE};
    use windows_sys::Win32::System::JobObjects::{
        AssignProcessToJobObject, CreateJobObjectW, JobObjectExtendedLimitInformation,
        SetInformationJobObject, TerminateJobObject, JOBOBJECT_EXTENDED_LIMIT_INFORMATION,
        JOB_OBJECT_LIMIT_KILL_ON_JOB_CLOSE,
    };

    pub struct Job(HANDLE);

    // The handle is owned here and only closed in Drop.
    unsafe impl Send for Job {}
    unsafe impl Sync for Job {}

    impl Job {
        pub fn new() -> io::Result<Job> {
            unsafe {
                let handle = CreateJobObjectW(std::ptr::null(), std::ptr::null());
                if handle.is_null() {
                    return Err(io::Error::last_os_error());
                }
                let job = Job(handle);
                let mut info: JOBOBJECT_EXTENDED_LIMIT_INFORMATION = std::mem::zeroed();
                info.BasicLimitInformation.LimitFlags = JOB_OBJECT_LIMIT_KILL_ON_JOB_CLOSE;
                let ok = SetInformationJobObject(
                    job.0,
                    JobObjectExtendedLimitInformation,
                    &info as *const _ as *const core::ffi::c_void,
                    std::mem::size_of::<JOBOBJECT_EXTENDED_LIMIT_INFORMATION>() as u32,
                );
                if ok == 0 {
                    return Err(io::Error::last_os_error());
                }
                Ok(job)
            }
        }

        pub fn assign(&self, child: &Child) -> io::Result<()> {
            let ok = unsafe { AssignProcessToJobObject(self.0, child.as_raw_handle() as HANDLE) };
            if ok == 0 {
                Err(io::Error::last_os_error())
            } else {
                Ok(())
            }
        }

        pub fn terminate(&self) {
            unsafe {
                TerminateJobObject(self.0, 1);
            }
        }
    }

    impl Drop for Job {
        fn drop(&mut self) {
            unsafe {
                CloseHandle(self.0);
            }
        }
    }
}
