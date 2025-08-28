import { startRouter } from './router.js';
import { store, KEYS } from './state/store.js';
import { EventPage } from './pages/eventPage.js';

const app = document.getElementById('app');
let current;

function mount(node) {
  if (current && current._cleanup) current._cleanup();
  app.innerHTML = '';
  app.append(node);
  current = node;
}

store.subscribe(KEYS.route, (route) => {
  if (route.name === 'event') {
    mount(EventPage({ slug: route.params.slug }));
  }
});

startRouter();
