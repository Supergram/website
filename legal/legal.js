document.addEventListener("DOMContentLoaded", () => {
  const selectors = document.querySelectorAll("[data-policy-select]");

  selectors.forEach((selector) => {
    selector.addEventListener("change", (event) => {
      const destination = event.currentTarget.value;

      if (destination && !window.location.pathname.endsWith(destination)) {
        window.location.href = destination;
      }
    });
  });
});
