<script lang="ts">
  import { page } from '$app/stores';

  interface NavItem {
    title: string;
    href: string;
    icon?: string;
  }

  const navItems: NavItem[] = [
    { title: 'Overview', href: '/docs' },
    { title: 'Getting Started', href: '/docs/getting-started' },
    { title: 'Editor', href: '/docs/editor' },
    { title: 'Drawing', href: '/docs/drawing' },
    { title: 'Keyboard Shortcuts', href: '/docs/shortcuts' },
  ];

  function isActive(href: string): boolean {
    if (href === '/docs') {
      return $page.url.pathname === '/docs';
    }
    return $page.url.pathname.startsWith(href);
  }
</script>

<div class="docs-layout">
  <aside class="docs-sidebar">
    <a href="/" class="docs-logo">
      <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 100 141.42">
        <path fill="#757575" d="M8 0C3.58 0 0 3.58 0 8v125.42c0 4.42 3.58 8 8 8h84c4.42 0 8-3.58 8-8V25L75 0H8z"/>
        <path fill="#424242" d="M75 0v25h25L75 0z"/>
        <rect x="20" y="50" width="60" height="6" rx="3" ry="3" fill="#ffffff"/>
        <rect x="20" y="70" width="60" height="6" rx="3" ry="3" fill="#ffffff"/>
        <rect x="20" y="90" width="36" height="6" rx="3" ry="3" fill="#ffffff"/>
      </svg>
      <span>Glow Docs</span>
    </a>

    <nav class="docs-nav">
      <ul>
        {#each navItems as item}
          <li>
            <a href={item.href} class:active={isActive(item.href)}>
              {item.title}
            </a>
          </li>
        {/each}
      </ul>
    </nav>

    <div class="docs-sidebar-footer">
      <a href="/" class="back-link">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M19 12H5M12 19l-7-7 7-7" />
        </svg>
        Back to App
      </a>
    </div>
  </aside>

  <main class="docs-content">
    <div class="docs-content-inner">
      <slot />
    </div>
  </main>
</div>

<style>
  .docs-layout {
    display: flex;
    height: 100vh;
    background-color: var(--glow-bg-base);
    overflow: hidden;
  }

  .docs-sidebar {
    width: 260px;
    background-color: var(--glow-bg-surface);
    border-right: 1px solid var(--glow-border-subtle);
    display: flex;
    flex-direction: column;
    position: fixed;
    top: 0;
    left: 0;
    height: 100vh;
    overflow-y: auto;
  }

  .docs-logo {
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 20px 24px;
    text-decoration: none;
    color: var(--glow-text-primary);
    font-size: 18px;
    font-weight: 600;
    border-bottom: 1px solid var(--glow-border-subtle);
  }

  .docs-logo svg {
    flex-shrink: 0;
  }

  .docs-nav {
    flex: 1;
    padding: 16px 0;
  }

  .docs-nav ul {
    list-style: none;
    margin: 0;
    padding: 0;
  }

  .docs-nav li {
    margin: 2px 8px;
  }

  .docs-nav a {
    display: block;
    padding: 10px 16px;
    color: var(--glow-text-secondary);
    text-decoration: none;
    border-radius: 6px;
    font-size: 14px;
    transition: all 0.15s ease;
  }

  .docs-nav a:hover {
    color: var(--glow-text-primary);
    background-color: var(--glow-bg-elevated);
  }

  .docs-nav a.active {
    color: var(--glow-accent);
    background-color: rgba(59, 130, 246, 0.1);
    font-weight: 500;
  }

  .docs-sidebar-footer {
    padding: 16px 24px;
    border-top: 1px solid var(--glow-border-subtle);
  }

  .back-link {
    display: flex;
    align-items: center;
    gap: 8px;
    color: var(--glow-text-tertiary);
    text-decoration: none;
    font-size: 13px;
    transition: color 0.15s ease;
  }

  .back-link:hover {
    color: var(--glow-text-primary);
  }

  .back-link svg {
    width: 16px;
    height: 16px;
  }

  .docs-content {
    flex: 1;
    margin-left: 260px;
    overflow-y: auto;
  }

  .docs-content-inner {
    max-width: 800px;
    padding: 48px 64px;
  }

  /* Responsive */
  @media (max-width: 768px) {
    .docs-sidebar {
      width: 100%;
      position: relative;
      height: auto;
      border-right: none;
      border-bottom: 1px solid var(--glow-border-subtle);
    }

    .docs-layout {
      flex-direction: column;
    }

    .docs-content {
      margin-left: 0;
    }

    .docs-content-inner {
      padding: 32px 24px;
    }
  }
</style>
