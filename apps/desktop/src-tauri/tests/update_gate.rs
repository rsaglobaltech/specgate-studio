//! draft-desktop REQ-156 SCN-460 — the shell installs an accepted update only
//! when every open project's host says nothing runs (core's `updateStep`).

use specgate_studio_desktop::update::{all_allow, Decision, Notice};

fn decision(install: bool, en: &str) -> Decision {
    Decision {
        install,
        notice: Notice {
            en: en.into(),
            es: en.into(),
        },
    }
}

#[test]
fn req_156_scn_460_one_project_building_holds_the_update_and_says_why() {
    let idle = decision(true, "Installing 0.7.1 over 0.7.0…");
    let building = decision(
        false,
        "The build of REQ-030 is running: the update to 0.7.1 installs once it ends. Nothing is installed meanwhile.",
    );
    assert_eq!(all_allow(&[idle.clone(), building.clone()]), Err(building));
    assert_eq!(all_allow(&[idle.clone(), idle]), Ok(()));
}

#[test]
fn req_156_scn_459_the_hosts_answer_in_the_shape_the_shell_reads() {
    let json = r#"{"install":true,"notice":{"en":"Installing 0.7.1 over 0.7.0…","es":"Instalando la 0.7.1 sobre la 0.7.0…"}}"#;
    let d: Decision = serde_json::from_str(json).unwrap();
    assert!(d.install);
    assert_eq!(d.notice.en, "Installing 0.7.1 over 0.7.0…");
}
