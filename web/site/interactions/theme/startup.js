  const themeColor = document.querySelector('meta[name="theme-color"]');
  const themeToggle = document.querySelector("[data-theme-toggle]");
  const themeOverrideKey = "cg-theme-override";
  const prefersDark = window.matchMedia("(prefers-color-scheme: dark)");

  function currentTheme() {
    return document.documentElement.getAttribute("data-theme") === "light" ? "light" : "dark";
  }

  function systemTheme() {
    return prefersDark.matches ? "dark" : "light";
  }

  function storedTheme() {
    try {
      const theme = localStorage.getItem(themeOverrideKey);
      if (theme === "light" || theme === "dark") return theme;
    } catch {}
    return null;
  }

  function applyTheme(theme, persist) {
    document.documentElement.setAttribute("data-theme", theme);
    if (persist) {
      try { localStorage.setItem(themeOverrideKey, theme); } catch {}
    }
    if (themeColor) themeColor.setAttribute("content", theme === "dark" ? "#07131F" : "#F4F7F8");
    if (themeToggle) {
      const label = themeToggle.querySelector(".visually-hidden");
      const next = theme === "dark" ? "Switch to light theme" : "Switch to dark theme";
      if (label) label.textContent = next;
      themeToggle.setAttribute("title", next);
      themeToggle.setAttribute("aria-pressed", String(theme === "dark"));
    }
  }

  applyTheme(storedTheme() || systemTheme(), false);
  if (themeToggle) {
    themeToggle.addEventListener("click", (event) => {
      event.stopPropagation();
      applyTheme(currentTheme() === "dark" ? "light" : "dark", true);
    });
  }
  prefersDark.addEventListener("change", () => {
    if (!storedTheme()) applyTheme(systemTheme(), false);
  });

