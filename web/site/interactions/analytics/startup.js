  // Contract Graph GA4 property. Do not reuse sarada.io's G-R7460XHMFM.
  const GA_MEASUREMENT_ID = "G-WFGE117XBY";

  const report = (eventName, parameters) => {
    if (typeof window.gtag === "function") {
      window.gtag("event", eventName, parameters);
    }
  };

  if (GA_MEASUREMENT_ID) {
    window.dataLayer = window.dataLayer || [];
    function gtag() {
      window.dataLayer.push(arguments);
    }
    window.gtag = gtag;
    gtag("js", new Date());
    gtag("config", GA_MEASUREMENT_ID);

    const loadGtag = () => {
      if (document.querySelector('script[src*="googletagmanager.com/gtag/js"]')) return;
      const script = document.createElement("script");
      script.src = "https://www.googletagmanager.com/gtag/js?id=" + GA_MEASUREMENT_ID;
      script.async = true;
      document.head.appendChild(script);
    };

    const scheduleGtag = () => {
      if ("requestIdleCallback" in window) {
        window.requestIdleCallback(loadGtag, { timeout: 2500 });
      } else {
        window.setTimeout(loadGtag, 1);
      }
    };

    if (document.readyState === "complete") scheduleGtag();
    else window.addEventListener("load", scheduleGtag);
  }

