import { createApp } from 'vue'
import { createPinia } from 'pinia'

import App from './App.vue'
import router from './router'
import { useAuthStore } from '@/stores/auth'

// Import Bootstrap CSS (npm install bootstrap)
import 'bootstrap/dist/css/bootstrap.min.css';

// Import Bootstrap JS (npm install bootstrap)
import 'bootstrap/dist/js/bootstrap.bundle.min.js';

const app = createApp(App)
app.use(createPinia())

// Restore any saved login session first, so the router guard knows
// who is logged in before the first page is chosen.
const auth = useAuthStore()
auth.init().then(() => {
  app.use(router)
  app.mount('#app')
})
