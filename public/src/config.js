// Toggle to hit real serverless API instead of mocks
window.__USE_REAL_API__ = true;

// Default route if none provided: /e/:slug
if (!location.pathname.startsWith('/e/')) {
  const slug = 'lensa-kami';
  history.replaceState({}, '', `/e/${slug}`);
}
