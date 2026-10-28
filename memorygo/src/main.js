import { createApp } from 'vue'
import { createPinia } from 'pinia'
import { useAuthStore } from '@/stores/auth'

import App from './App.vue'
import router from './router'

// Import Bootstrap CSS (npm install bootstrap)
import 'bootstrap/dist/css/bootstrap.min.css';

// Import Bootstrap JS (npm install bootstrap)
import 'bootstrap/dist/js/bootstrap.bundle.min.js';
import '@fortawesome/fontawesome-free/css/all.min.css'

// Design tokens + page defaults from the handoff. Loaded after Bootstrap so ours win
import '@/styles/tokens.css'
import '@/styles/base.css'

const app = createApp(App)
app.use(createPinia())

// Restore any saved login session first, so the router guard knows
// who is logged in before the first page is chosen
const auth = useAuthStore()         // useAuthStore is from the stores/auth.js piania so that 'method' can be used anywhere
auth.init().then(() => {
    app.use(router)                 //installs the router
    app.mount('#app')               // renders the first page
})
