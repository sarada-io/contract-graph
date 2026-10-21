  const videoDialog = document.getElementById("contract-video-dialog");
  const videoFrame = document.getElementById("contract-video-frame");
  const videoClose = document.querySelector("[data-video-close]");

  if (videoDialog && videoFrame && videoClose) {
    const isWatchLink = () => window.location.hash === "#watch";

    function openVideo() {
      if (!isWatchLink() || videoDialog.open) return;
      videoDialog.showModal();
      videoFrame.src = videoFrame.dataset.src;
      report("cg_video_open", {
        video_name: "contract_graph_overview",
        page_path: window.location.pathname,
        open_source: "deep_link"
      });
    }

    videoClose.addEventListener("click", () => videoDialog.close());
    videoDialog.addEventListener("click", (event) => {
      if (event.target === videoDialog) videoDialog.close();
    });
    videoDialog.addEventListener("close", () => {
      videoFrame.removeAttribute("src");
      if (isWatchLink()) {
        history.replaceState(null, "", window.location.pathname + window.location.search);
      }
    });
    window.addEventListener("hashchange", () => {
      if (isWatchLink()) openVideo();
      else if (videoDialog.open) videoDialog.close();
    });
    openVideo();
  }

