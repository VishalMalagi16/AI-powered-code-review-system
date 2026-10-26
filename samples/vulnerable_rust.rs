use std::fs::File;
use std::process::Command;

// 1. Unchecked raw pointer dereference
pub fn process_pointer(ptr: *const u8) -> u8 {
    unsafe {
        // Raw pointer dereference without null check
        *ptr
    }
}

// 2. Dangerous unwrap in production
pub fn open_file(path: &str) -> File {
    File::open(path).unwrap() // Thread panic hazard
}

// 3. Command injection via shell
pub fn run_script(user_script: &str) {
    Command::new("sh")
        .arg("-c")
        .arg(user_script)
        .output()
        .ok();
}
