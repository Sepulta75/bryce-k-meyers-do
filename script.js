/* Dr. Bryce Myers, MD — interactions */
(function () {
  "use strict";

  /* ----- year ----- */
  var yr = document.getElementById("yr");
  if (yr) yr.textContent = new Date().getFullYear();

  /* ----- sticky nav ----- */
  var nav = document.getElementById("nav");
  function onScroll() {
    if (window.scrollY > 24) nav.classList.add("scrolled");
    else nav.classList.remove("scrolled");
  }
  onScroll();
  window.addEventListener("scroll", onScroll, { passive: true });

  /* ----- mobile drawer ----- */
  var burger = document.getElementById("burger");
  var drawer = document.getElementById("drawer");
  if (burger && drawer) {
    burger.addEventListener("click", function () {
      drawer.classList.toggle("open");
      document.body.style.overflow = drawer.classList.contains("open") ? "hidden" : "";
    });
    drawer.querySelectorAll("a").forEach(function (a) {
      a.addEventListener("click", function () {
        drawer.classList.remove("open");
        document.body.style.overflow = "";
      });
    });
  }

  /* ----- reveal on scroll ----- */
  var reveals = document.querySelectorAll("[data-reveal]");
  if ("IntersectionObserver" in window) {
    var io = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (e, i) {
          if (e.isIntersecting) {
            var el = e.target;
            setTimeout(function () { el.classList.add("in"); }, (i % 6) * 70);
            io.unobserve(el);
          }
        });
      },
      { threshold: 0.12, rootMargin: "0px 0px -60px 0px" }
    );
    reveals.forEach(function (el) { io.observe(el); });
  } else {
    reveals.forEach(function (el) { el.classList.add("in"); });
  }

  /* ----- FAQ accordion ----- */
  document.querySelectorAll(".acc-item").forEach(function (item) {
    var q = item.querySelector(".acc-q");
    var a = item.querySelector(".acc-a");
    if (!q || !a) return;
    if (item.classList.contains("open")) a.style.maxHeight = a.scrollHeight + "px";
    q.addEventListener("click", function () {
      var isOpen = item.classList.contains("open");
      document.querySelectorAll(".acc-item").forEach(function (other) {
        other.classList.remove("open");
        var oa = other.querySelector(".acc-a");
        if (oa) oa.style.maxHeight = null;
      });
      if (!isOpen) {
        item.classList.add("open");
        a.style.maxHeight = a.scrollHeight + "px";
      }
    });
  });

  /* ----- booking form ----- */
  var form = document.getElementById("bookForm");
  var msg = document.getElementById("formMsg");
  var btn = document.getElementById("bookBtn");
  if (form) {
    form.addEventListener("submit", function (e) {
      e.preventDefault();
      var first = form.first.value.trim();
      var last = form.last.value.trim();
      var email = form.email.value.trim();
      if (!first || !last || !email || email.indexOf("@") === -1) {
        msg.style.color = "#ffb4a2";
        msg.textContent = "Please add your name and a valid email so we can reach you.";
        return;
      }
      btn.disabled = true;
      btn.textContent = "Sending…";
      msg.style.color = "var(--gold-soft)";
      msg.textContent = "";
      setTimeout(function () {
        btn.textContent = "Request received ✓";
        msg.style.color = "#9fe6c4";
        msg.textContent =
          "Thank you, " + first + "! Our office will contact you within one business day.";
        form.reset();
        setTimeout(function () {
          btn.disabled = false;
          btn.textContent = "Request appointment";
        }, 3200);
      }, 900);
    });
  }

  /* ----- smooth anchor offset for fixed nav ----- */
  document.querySelectorAll('a[href^="#"]').forEach(function (a) {
    a.addEventListener("click", function (e) {
      var id = a.getAttribute("href");
      if (id.length < 2) return;
      var el = document.querySelector(id);
      if (!el) return;
      e.preventDefault();
      var top = el.getBoundingClientRect().top + window.scrollY - (id === "#top" ? 0 : 72);
      window.scrollTo({ top: top, behavior: "smooth" });
    });
  });
})();
