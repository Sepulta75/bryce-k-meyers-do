import { optionalElement, requireElement } from '@presentation/dom';

/** Adds `.scrolled` to the header once the page has moved, for the nav shadow. */
export function initStickyNav(): void {
  const nav = optionalElement<HTMLElement>('#nav');
  if (nav === null) return;

  const onScroll = (): void => {
    nav.classList.toggle('scrolled', window.scrollY > 24);
  };

  onScroll();
  window.addEventListener('scroll', onScroll, { passive: true });
}

/** Mobile drawer open/close, including body scroll lock. */
export function initMobileDrawer(): void {
  const burger = optionalElement<HTMLButtonElement>('#burger');
  const drawer = optionalElement<HTMLElement>('#drawer');
  if (burger === null || drawer === null) return;

  const close = (): void => {
    drawer.classList.remove('open');
    document.body.style.overflow = '';
  };

  burger.addEventListener('click', () => {
    drawer.classList.toggle('open');
    const isOpen = drawer.classList.contains('open');
    document.body.style.overflow = isOpen ? 'hidden' : '';
    burger.setAttribute('aria-expanded', String(isOpen));
  });

  for (const link of drawer.querySelectorAll('a')) {
    link.addEventListener('click', close);
  }
}

/** Fades sections in as they enter the viewport; degrades to visible. */
export function initRevealOnScroll(): void {
  const targets = document.querySelectorAll<HTMLElement>('[data-reveal]');
  if (targets.length === 0) return;

  if (!('IntersectionObserver' in window)) {
    for (const el of targets) el.classList.add('in');
    return;
  }

  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry, index) => {
        if (!entry.isIntersecting) return;
        const el = entry.target;
        globalThis.setTimeout(() => { el.classList.add('in'); }, (index % 6) * 70);
        observer.unobserve(el);
      });
    },
    { threshold: 0.12, rootMargin: '0px 0px -60px 0px' },
  );

  for (const el of targets) observer.observe(el);
}

/** One-open-at-a-time FAQ accordion. */
export function initFaqAccordion(): void {
  const items = document.querySelectorAll<HTMLElement>('.acc-item');

  items.forEach((item) => {
    const question = item.querySelector<HTMLElement>('.acc-q');
    const answer = item.querySelector<HTMLElement>('.acc-a');
    if (question === null || answer === null) return;

    if (item.classList.contains('open')) {
      answer.style.maxHeight = `${String(answer.scrollHeight)}px`;
    }

    question.addEventListener('click', () => {
      const wasOpen = item.classList.contains('open');

      for (const other of items) {
        other.classList.remove('open');
        const otherAnswer = other.querySelector<HTMLElement>('.acc-a');
        if (otherAnswer !== null) otherAnswer.style.maxHeight = '';
      }

      if (!wasOpen) {
        item.classList.add('open');
        answer.style.maxHeight = `${String(answer.scrollHeight)}px`;
      }
    });
  });
}

/** Anchor links scroll under the fixed nav instead of hiding beneath it. */
export function initSmoothAnchors(): void {
  const links = document.querySelectorAll<HTMLAnchorElement>('a[href^="#"]');

  for (const link of links) {
    link.addEventListener('click', (event) => {
      const href = link.getAttribute('href');
      if (href === null || href.length < 2) return;

      const target = document.querySelector(href);
      if (target === null) return;

      event.preventDefault();
      const offset = href === '#top' ? 0 : 72;
      const top = target.getBoundingClientRect().top + window.scrollY - offset;
      window.scrollTo({ top, behavior: 'smooth' });
    });
  }
}

/** Keeps the footer copyright year current. */
export function initFooterYear(): void {
  const year = optionalElement<HTMLElement>('#yr');
  if (year !== null) year.textContent = String(new Date().getFullYear());
}

/** Convenience: everything that is not the contact form. */
export function initStaticInteractions(): void {
  initFooterYear();
  initStickyNav();
  initMobileDrawer();
  initRevealOnScroll();
  initFaqAccordion();
  initSmoothAnchors();
}

// Re-exported for tests/tools that want a single entry point.
export { requireElement };
