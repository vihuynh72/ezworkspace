// Demo mode: judges open the employer view without an account. The server must have DEMO_MODE=1.
const KEY = "ezw.demoEmployer";

export function isDemoEmployer() {
  try {
    return localStorage.getItem(KEY) === "1";
  } catch {
    return false;
  }
}

export function setDemoEmployer(on: boolean) {
  try {
    if (on) localStorage.setItem(KEY, "1");
    else localStorage.removeItem(KEY);
  } catch {
    // Storage blocked: the demo still works for this page view.
  }
  location.hash = "";
  location.reload();
}
