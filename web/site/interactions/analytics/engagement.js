  document.querySelectorAll(".tutorial-nav a").forEach((link) => {
    link.addEventListener("click", () => {
      report("cg_section_navigation", {
        section_id: link.hash.slice(1),
        link_text: link.textContent.trim(),
        page_path: window.location.pathname
      });
    });
  });

  const seen = new Set();
  const sections = Array.from(document.querySelectorAll("[data-track-section]"));
  const sendSectionView = (section, index) => {
    const sectionId = section.dataset.trackSection;
    if (seen.has(sectionId)) return;
    seen.add(sectionId);
    report("cg_section_view", {
      section_id: sectionId,
      section_title: section.dataset.sectionTitle,
      section_index: index + 1,
      page_path: window.location.pathname,
      non_interaction: true
    });
  };

  if ("IntersectionObserver" in window) {
    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        const section = entry.target.closest("[data-track-section]");
        sendSectionView(section, sections.indexOf(section));
        observer.unobserve(entry.target);
      });
    }, { rootMargin: "0px 0px -55% 0px", threshold: 0.1 });

    sections.forEach((section) => {
      const marker = section.querySelector("[data-track-marker]") || section.querySelector("h1, h2");
      if (marker) observer.observe(marker);
    });
  } else {
    sections.forEach(sendSectionView);
  }
