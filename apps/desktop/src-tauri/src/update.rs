//! The update (draft-desktop REQ-156): checked when the studio starts,
//! offered, installed only once the Developer accepts and only while no build
//! and no write command runs in any open project, applied on the next
//! restart. Whether to install and what to say is the host's answer — core's
//! rule (`updateStep`) — never decided here.

use serde::Deserialize;
use std::time::Duration;

/// The host's answer for one step of the update.
#[derive(Debug, Clone, Deserialize, PartialEq, Eq)]
pub struct Decision {
    pub install: bool,
    pub notice: Notice,
}

#[derive(Debug, Clone, Deserialize, PartialEq, Eq)]
pub struct Notice {
    pub en: String,
    pub es: String,
}

/// How often an accepted update asks again while a build or a write runs.
pub const RETRY: Duration = Duration::from_secs(15);

/// The public key the updater verifies with, until the owner sets the real one.
pub const PLACEHOLDER_PUBKEY: &str = "REPLACE_WITH_TAURI_UPDATER_PUBLIC_KEY";

/// Whether the hosts let an accepted update install now: every one of them must.
/// The first answer that says wait is the one shown.
pub fn all_allow(answers: &[Decision]) -> Result<(), Decision> {
    match answers.iter().find(|d| !d.install) {
        Some(wait) => Err(wait.clone()),
        None => Ok(()),
    }
}
