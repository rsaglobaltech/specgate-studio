//! draft-desktop REQ-152 — one window per project: the shell's side. The key
//! is the sidecar's — the same for every spelling of the folder (Node test
//! apps/desktop/test/windows.test.ts).

use specgate_studio_desktop::windows::{Opening, ProjectWindows};

#[test]
fn req_152_scn_453_a_second_project_opens_a_second_window_and_the_first_is_unchanged() {
    let mut w = ProjectWindows::default();
    let sprich = w.open("/users/dev/mvp/sprich-platform/sprich");
    let studio = w.open("/users/dev/mvp/specgate-studio");
    assert_eq!(sprich, Opening::Create("project-1".into()));
    assert_eq!(studio, Opening::Create("project-2".into()));
    assert_eq!(w.len(), 2);
}

#[test]
fn req_152_scn_454_opening_sprich_again_focuses_its_window() {
    let mut w = ProjectWindows::default();
    let key = "/home/dev/mvp/sprich-platform/sprich";
    assert_eq!(w.open(key), Opening::Create("project-1".into()));
    assert_eq!(w.open(key), Opening::Focus("project-1".into()));
    assert_eq!(w.len(), 1, "still exactly one window for sprich");
}

#[test]
fn req_152_a_closed_window_frees_its_project_so_it_opens_again_in_a_new_window() {
    let mut w = ProjectWindows::default();
    let key = "/home/dev/sprich";
    w.open(key);
    assert_eq!(w.closed("project-1").as_deref(), Some(key));
    assert!(w.is_empty());
    assert_eq!(w.open(key), Opening::Create("project-2".into()));
    assert_eq!(w.closed("project-9"), None);
}
