(function () {
  "use strict";

  var toggle = document.querySelector(".nav-toggle");
  var nav = document.querySelector(".site-nav");

  if (toggle && nav) {
    toggle.addEventListener("click", function () {
      var isOpen = nav.classList.toggle("is-open");
      toggle.setAttribute("aria-expanded", String(isOpen));
    });

    nav.querySelectorAll("a").forEach(function (link) {
      link.addEventListener("click", function () {
        nav.classList.remove("is-open");
        toggle.setAttribute("aria-expanded", "false");
      });
    });
  }

  var year = document.getElementById("current-year");
  if (year) {
    year.textContent = String(new Date().getFullYear());
  }

  var sections = Array.from(document.querySelectorAll("main section[id]"));
  var navLinks = Array.from(document.querySelectorAll('.site-nav a[href^="#"]'));

  if ("IntersectionObserver" in window && sections.length && navLinks.length) {
    var observer = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        navLinks.forEach(function (link) {
          link.classList.toggle("is-active", link.getAttribute("href") === "#" + entry.target.id);
        });
      });
    }, { rootMargin: "-25% 0px -65%", threshold: 0 });

    sections.forEach(function (section) {
      observer.observe(section);
    });
  }
})();
