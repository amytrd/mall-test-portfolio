/* 作品集页面交互：导航高亮 + 顶栏滚动态 */
(function () {
  "use strict";

  const header = document.querySelector(".site-header");
  const navLinks = Array.from(document.querySelectorAll(".site-nav a[href^='#']"));

  if (header) {
    const onScroll = function () {
      header.classList.toggle("scrolled", window.scrollY > 8);
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
  }

  if (!("IntersectionObserver" in window) || navLinks.length === 0) return;

  const sections = navLinks
    .map(function (link) {
      const id = link.getAttribute("href").slice(1);
      const section = document.getElementById(id);
      return section ? { id: id, link: link, section: section } : null;
    })
    .filter(Boolean);

  const observer = new IntersectionObserver(
    function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        navLinks.forEach(function (link) {
          link.classList.remove("active");
          link.removeAttribute("aria-current");
        });
        const match = sections.find(function (item) {
          return item.id === entry.target.id;
        });
        if (match) {
          match.link.classList.add("active");
          match.link.setAttribute("aria-current", "location");
        }
      });
    },
    { rootMargin: "-35% 0px -55% 0px", threshold: 0 }
  );

  sections.forEach(function (item) {
    observer.observe(item.section);
  });
})();
