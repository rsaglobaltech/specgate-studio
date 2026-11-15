//! The session token between the shell and its sidecar (draft-desktop
//! REQ-151, A2). The shell makes a new secret for each sidecar it starts and
//! hands it over in the environment — never in the arguments, which every
//! process on the machine can list — and loads the window with it. The host
//! answers nothing without it: no other local page or process gets in.

/// Where the sidecar reads its token.
pub const TOKEN_ENV: &str = "SPECGATE_STUDIO_TOKEN";

/// A new per-launch secret: 32 bytes from the system's random source, in hex.
pub fn new_token() -> String {
    let mut bytes = [0u8; 32];
    getrandom::fill(&mut bytes).expect("the system's random source");
    bytes.iter().map(|b| format!("{b:02x}")).collect()
}

/// The address the window loads: the host's, with the window's token. The
/// host keeps it in a cookie of its own and takes it out of the address.
pub fn window_url(host_url: &str, token: &str) -> String {
    let base = host_url.split('?').next().unwrap_or(host_url);
    format!("{base}?token={token}")
}
