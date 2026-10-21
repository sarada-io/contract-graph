  document.querySelectorAll("[data-copy]").forEach((button) => {
    button.addEventListener("click", async () => {
      const scope = button.getAttribute("data-copy-scope");
      const target = scope
        ? document.querySelector(scope + ' [role="tabpanel"]:not([hidden]) code')
        : document.getElementById(button.getAttribute("data-copy"));
      if (!target) return;
      const text = target.innerText.trim();
      try {
        await navigator.clipboard.writeText(text);
        const original = button.textContent;
        button.textContent = "Copied";
        report("cg_copy_command", { page_path: window.location.pathname });
        window.setTimeout(() => { button.textContent = original; }, 1600);
      } catch {
        button.textContent = "Copy failed";
      }
    });
  });

