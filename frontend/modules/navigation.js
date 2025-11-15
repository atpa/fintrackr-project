const DEFAULT_BREAKPOINT = 1024;

function highlightActiveLink() {
  const current = window.location.pathname
    .replace(/\/index\.html$/, "/")
    .replace(/\.html$/, "");

  document.querySelectorAll('.sidebar .nav-link[href]').forEach((link) => {
    try {
      const href = new URL(link.getAttribute('href'), window.location.origin)
        .pathname.replace(/\/index\.html$/, "/")
        .replace(/\.html$/, "");

      if (href === current || (href === '/' && current === '/')) {
        link.classList.add('active');
      }
    } catch (err) {
      // Ignore malformed URLs
    }
  });
}

function setupNavigation({ breakpoint = DEFAULT_BREAKPOINT } = {}) {
  const sidebar = document.querySelector('.sidebar');
  const sidebarBackdrop = document.querySelector('.sidebar-backdrop');
  const burger = document.querySelector('.burger');

  if (!sidebar) {
    return;
  }

  const openSidebar = () => {
    sidebar.classList.add('open');
    if (sidebarBackdrop) sidebarBackdrop.classList.add('open');
    if (burger) {
      burger.classList.add('open');
      burger.setAttribute('aria-expanded', 'true');
    }
  };

  const closeSidebar = () => {
    sidebar.classList.remove('open');
    if (sidebarBackdrop) sidebarBackdrop.classList.remove('open');
    if (burger) {
      burger.classList.remove('open');
      burger.setAttribute('aria-expanded', 'false');
    }
  };

  const toggleSidebar = () => {
    if (sidebar.classList.contains('open')) {
      closeSidebar();
    } else {
      openSidebar();
    }
  };

  if (burger) {
    burger.addEventListener('click', toggleSidebar);
  }

  if (sidebarBackdrop) {
    sidebarBackdrop.addEventListener('click', closeSidebar);
  }

  sidebar.querySelectorAll('.nav-link').forEach((link) => {
    link.addEventListener('click', () => {
      if (window.innerWidth < breakpoint) {
        closeSidebar();
      }
    });
  });

  document
    .querySelectorAll('.sidebar .auth-link, .sidebar .logout-btn')
    .forEach((btn) => {
      btn.addEventListener('click', (event) => {
        event.stopPropagation();
      });
    });

  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && sidebar.classList.contains('open')) {
      closeSidebar();
    }
  });

  window.addEventListener('resize', () => {
    if (window.innerWidth >= breakpoint) {
      closeSidebar();
    }
  });

  highlightActiveLink();
}

export function initNavigation(options = {}) {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => setupNavigation(options), {
      once: true,
    });
  } else {
    setupNavigation(options);
  }
}

export function setActiveNavigation() {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', highlightActiveLink, {
      once: true,
    });
  } else {
    highlightActiveLink();
  }
}

export default initNavigation;
