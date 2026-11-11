// No console window beside the studio's on Windows release builds.
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

fn main() {
    specgate_studio_desktop::run();
}
