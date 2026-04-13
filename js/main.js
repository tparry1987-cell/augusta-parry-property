'use strict';

document.addEventListener('DOMContentLoaded', () => {

  // ===== 1. Navbar Scroll Behavior =====
  const navbar = document.querySelector('nav');
  if (navbar) {
    let ticking = false;
    const updateNavbar = () => {
      if (window.scrollY > 50) {
        navbar.classList.add('is-scrolled');
      } else {
        navbar.classList.remove('is-scrolled');
      }
      ticking = false;
    };
    window.addEventListener('scroll', () => {
      if (!ticking) { requestAnimationFrame(updateNavbar); ticking = true; }
    }, { passive: true });
    updateNavbar();
  }

  // ===== 2. Mobile Menu =====
  const mobileToggle = document.getElementById('mobile-toggle');
  const mobileClose = document.getElementById('mobile-close');
  const mobileMenu = document.getElementById('mobile-menu');

  if (mobileToggle && mobileMenu) {
    const openMenu = () => {
      mobileMenu.classList.remove('translate-x-full');
      mobileMenu.classList.add('translate-x-0');
      document.body.style.overflow = 'hidden';
    };
    const closeMenu = () => {
      mobileMenu.classList.remove('translate-x-0');
      mobileMenu.classList.add('translate-x-full');
      document.body.style.overflow = '';
    };

    mobileToggle.addEventListener('click', openMenu);
    if (mobileClose) mobileClose.addEventListener('click', closeMenu);

    mobileMenu.querySelectorAll('a').forEach(link => {
      link.addEventListener('click', closeMenu);
    });

    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') closeMenu();
    });
  }

  // ===== 3. Scroll Reveal Animations =====
  const fadeElements = document.querySelectorAll('.fade-in-up');
  if (fadeElements.length > 0) {
    const revealObserver = new IntersectionObserver((entries, observer) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('visible');
          observer.unobserve(entry.target);
        }
      });
    }, { threshold: 0.1, rootMargin: '0px 0px -30px 0px' });
    fadeElements.forEach(el => revealObserver.observe(el));
  }

  // ===== 4. Smooth Scroll =====
  document.querySelectorAll('a[href^="#"]').forEach(link => {
    link.addEventListener('click', (e) => {
      const href = link.getAttribute('href');
      if (!href || href === '#') return;
      const target = document.querySelector(href);
      if (!target) return;
      e.preventDefault();
      const top = target.getBoundingClientRect().top + window.scrollY - 80;
      window.scrollTo({ top, behavior: 'smooth' });
    });
  });

  // ===== 5. Property Card Expand/Collapse =====
  window.toggleDetail = function(card) {
    if (!card) return;
    const detail = card.querySelector('.property-detail');
    if (!detail) return;
    const isOpen = detail.style.maxHeight && detail.style.maxHeight !== '0px';

    // Close all others
    document.querySelectorAll('.property-card').forEach(c => {
      if (c !== card) {
        const d = c.querySelector('.property-detail');
        if (d) d.style.maxHeight = '0px';
      }
    });

    if (isOpen) {
      detail.style.maxHeight = '0px';
    } else {
      detail.style.maxHeight = detail.scrollHeight + 'px';
    }
  };

  // ===== 6. Contact Form =====
  const form = document.getElementById('contact-form');
  if (form) {
    form.querySelectorAll('input, textarea, select').forEach(f => {
      f.addEventListener('input', () => { f.style.borderColor = ''; });
    });

    form.addEventListener('submit', async (e) => {
      e.preventDefault();

      const name = form.querySelector('[name="name"]');
      const email = form.querySelector('[name="email"]');
      let valid = true;
      if (name && !name.value.trim()) { valid = false; name.style.borderColor = '#e74c3c'; }
      if (email && (!email.value.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.value))) {
        valid = false; email.style.borderColor = '#e74c3c';
      }
      if (!valid) return;

      const btn = document.getElementById('submit-btn');
      const originalHTML = btn?.innerHTML;
      if (btn) {
        btn.dataset.original = originalHTML;
        btn.innerHTML = 'Sending...';
        btn.disabled = true;
      }

      const payload = Object.fromEntries(new FormData(form).entries());

      try {
        const res = await fetch(form.action, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
          body: JSON.stringify(payload),
        });
        const ok = res.ok;
        const body = await res.json().catch(() => ({}));
        if (!ok) throw new Error(body.error || `HTTP ${res.status}`);

        if (btn) {
          btn.innerHTML = 'Enquiry Sent <span class="material-symbols-outlined text-sm">check</span>';
          btn.style.background = '#7a8b6f';
          btn.style.borderColor = '#7a8b6f';
        }
        form.reset();
        setTimeout(() => {
          if (btn) {
            btn.innerHTML = originalHTML;
            btn.style.background = '';
            btn.style.borderColor = '';
            btn.disabled = false;
          }
        }, 4000);
      } catch (err) {
        console.error('Contact form submit failed', err);
        if (btn) {
          btn.innerHTML = 'Try again — ' + (err.message || 'send failed');
          btn.style.background = '#e74c3c';
          btn.style.borderColor = '#e74c3c';
          setTimeout(() => {
            btn.innerHTML = originalHTML;
            btn.style.background = '';
            btn.style.borderColor = '';
            btn.disabled = false;
          }, 4000);
        }
      }
    });
  }

  // ===== 7. Stats Counter Animation =====
  const statElements = document.querySelectorAll('[data-count]');
  if (statElements.length > 0) {
    const easeOutQuart = t => 1 - Math.pow(1 - t, 4);

    const animateCounter = (el) => {
      const target = parseInt(el.dataset.count, 10);
      const duration = 2000;
      const start = performance.now();

      const tick = (now) => {
        const elapsed = now - start;
        const progress = Math.min(elapsed / duration, 1);
        const value = Math.round(easeOutQuart(progress) * target);
        el.textContent = value;
        if (progress < 1) requestAnimationFrame(tick);
        else el.textContent = target;
      };
      requestAnimationFrame(tick);
    };

    const statsObserver = new IntersectionObserver((entries, observer) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          animateCounter(entry.target);
          observer.unobserve(entry.target);
        }
      });
    }, { threshold: 0.5 });

    statElements.forEach(el => statsObserver.observe(el));
  }

  // ===== 8. Video Player =====
  const video = document.getElementById('elysia-video');
  const overlay = document.getElementById('video-overlay');
  const playIcon = document.getElementById('play-icon');
  const videoContainer = document.getElementById('video-container');

  if (video && overlay) {
    const togglePlay = (e) => {
      e.stopPropagation();
      if (video.paused) {
        video.muted = false;
        video.play();
        overlay.style.opacity = '0';
        setTimeout(() => { overlay.style.pointerEvents = 'none'; }, 500);
      } else {
        video.pause();
        overlay.style.opacity = '1';
        overlay.style.pointerEvents = 'auto';
        if (playIcon) playIcon.textContent = 'play_arrow';
      }
    };

    // Attach to both overlay and video so click works everywhere
    overlay.addEventListener('click', togglePlay);
    video.addEventListener('click', () => {
      video.pause();
      overlay.style.opacity = '1';
      overlay.style.pointerEvents = 'auto';
      if (playIcon) playIcon.textContent = 'play_arrow';
    });

    video.addEventListener('ended', () => {
      overlay.style.opacity = '1';
      overlay.style.pointerEvents = 'auto';
      if (playIcon) playIcon.textContent = 'replay';
    });
  }

  // ===== 9. Retell Widget Customisation =====
  function retellCustomize() {
    let host = null;
    document.querySelectorAll('div').forEach(function(el) {
      if (el.shadowRoot && el.style.position === 'fixed' && el.style.zIndex === '999999') {
        host = el;
      }
    });
    if (host && host.shadowRoot) {
      var sr = host.shadowRoot;
      var style = document.createElement('style');
      style.textContent =
        '.retell-chat-window { max-height: 400px !important; height: 400px !important; } ' +
        '#retell-fab { display: none !important; } ' +
        '.retell-popup-container { bottom: 70px !important; right: 0 !important; }';
      sr.appendChild(style);
      var inp = sr.querySelector('input[placeholder], textarea[placeholder]');
      if (inp) inp.placeholder = 'Ask about properties...';
      var fab = sr.querySelector('#retell-fab');
      var btn = document.getElementById('augustaChatLauncher');
      if (btn && fab) {
        btn.addEventListener('click', function() { fab.click(); });
        btn.addEventListener('mouseenter', function() {
          btn.style.transform = 'scale(1.1)';
          btn.style.boxShadow = '0 6px 28px rgba(196,149,106,0.5)';
        });
        btn.addEventListener('mouseleave', function() {
          btn.style.transform = 'scale(1)';
          btn.style.boxShadow = '0 4px 20px rgba(196,149,106,0.4)';
        });
      }
    } else {
      setTimeout(retellCustomize, 500);
    }
  }
  setTimeout(retellCustomize, 1000);

  // ===== 10. Active Nav Link Highlighting =====
  const sections = document.querySelectorAll('section[id]');
  const navLinks = document.querySelectorAll('nav a[href^="#"]');

  if (sections.length > 0 && navLinks.length > 0) {
    const sectionObserver = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          const id = entry.target.getAttribute('id');
          navLinks.forEach(link => {
            link.classList.toggle('text-primary', link.getAttribute('href') === '#' + id);
          });
        }
      });
    }, { threshold: 0.3, rootMargin: '-80px 0px -50% 0px' });

    sections.forEach(s => sectionObserver.observe(s));
  }

});
