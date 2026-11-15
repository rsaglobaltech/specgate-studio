//! One window per project (draft-desktop REQ-152). The project's key comes
//! from its sidecar — the same for every spelling of its folder — so opening
//! a project already open brings its window to the front instead of opening a
//! second window or starting a second host.

use std::collections::HashMap;

/// What opening a project does.
#[derive(Debug, Clone, PartialEq, Eq)]
pub enum Opening {
    /// The project has a window: bring this one to the front.
    Focus(String),
    /// A new window, with this label.
    Create(String),
}

#[derive(Debug, Default)]
pub struct ProjectWindows {
    by_key: HashMap<String, String>,
    opened: u32,
}

impl ProjectWindows {
    pub fn open(&mut self, key: &str) -> Opening {
        if let Some(label) = self.by_key.get(key) {
            return Opening::Focus(label.clone());
        }
        self.opened += 1;
        let label = format!("project-{}", self.opened);
        self.by_key.insert(key.to_string(), label.clone());
        Opening::Create(label)
    }

    /// A window closed: its project is no longer open. Returns its key.
    pub fn closed(&mut self, label: &str) -> Option<String> {
        let key = self
            .by_key
            .iter()
            .find(|(_, l)| l.as_str() == label)
            .map(|(k, _)| k.clone())?;
        self.by_key.remove(&key);
        Some(key)
    }

    pub fn len(&self) -> usize {
        self.by_key.len()
    }

    pub fn is_empty(&self) -> bool {
        self.by_key.is_empty()
    }
}
