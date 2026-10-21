  const navToggle = document.querySelector(".nav-toggle");
  const siteNav = document.getElementById("site-nav");
  const desktopNav = window.matchMedia("(min-width: 1024px)");

  function setNavOpen(open) {
    if (!navToggle || !siteNav) return;
    navToggle.setAttribute("aria-expanded", String(open));
    siteNav.classList.toggle("is-open", open);
    const label = navToggle.querySelector(".visually-hidden");
    if (label) label.textContent = open ? "Close menu" : "Open menu";
  }

  if (navToggle && siteNav) {
    navToggle.addEventListener("click", (event) => {
      event.stopPropagation();
      setNavOpen(navToggle.getAttribute("aria-expanded") !== "true");
    });
    siteNav.querySelectorAll("a").forEach((link) => {
      link.addEventListener("click", () => setNavOpen(false));
    });
    document.addEventListener("click", (event) => {
      if (!navToggle.contains(event.target) && !siteNav.contains(event.target)) {
        setNavOpen(false);
      }
    });
    document.addEventListener("keydown", (event) => {
      if (event.key === "Escape") setNavOpen(false);
    });
    desktopNav.addEventListener("change", (event) => {
      if (event.matches) setNavOpen(false);
    });
  }

