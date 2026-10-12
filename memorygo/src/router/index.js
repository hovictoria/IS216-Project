import { createRouter, createWebHistory } from 'vue-router'
import { useAuthStore } from '@/stores/auth'

/* login, sign-up imports */
import landing from "../components/auth/landing.vue"
import login from "../components/auth/login.vue"

import menu from "../components/menu.vue"
import profile from "../components/profile.vue"
import games from "../components/games/games.vue"
import memory from "../components/games/memory.vue"
import object from "../components/games/object.vue"
import sequence from "../components/games/sequence.vue"
import pattern from "../components/games/pattern.vue"
import missing from "../components/games/missing.vue"
import oddoneout from "../components/games/oddoneout.vue"

// Routes with `meta: { requiresAuth: true }` bounce logged-out users to /login.
const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: "/",                  // landing page (logged-in users are sent to /home)
      component: landing
    },
    {
      path: "/login",
      component: login
    },
    {
      path: "/home",              // main menu, was "/" before login existed
      component: menu,
      meta: { requiresAuth: true }
    },
    {
      path: "/profile",
      component: profile,
      meta: { requiresAuth: true }
    },
    {
      path: "/games",
      component: games,
      meta: { requiresAuth: true }
    },
    {
      path: "/object",
      component: object,
      meta: { requiresAuth: true }
    },
    {
      path: "/memory",
      component: memory,
      meta: { requiresAuth: true }
    },
    {
      path: "/sequence",
      component: sequence,
      meta: { requiresAuth: true }
    },
    {
      path: "/pattern",
      component: pattern,
      meta: { requiresAuth: true }
    },
    {
      path: "/missing",
      component: missing,
      meta: { requiresAuth: true }
    },
    {
      path: "/oddoneout",
      component: oddoneout,
      meta: { requiresAuth: true }
    }
  ],
})

// Runs before every navigation.
router.beforeEach((to) => {
  const auth = useAuthStore()

  // Logged out and heading somewhere protected: go sign in first.
  if (to.meta.requiresAuth && !auth.isLoggedIn) {
    return '/login'
  }

  // Already logged in: skip the landing and login pages.
  if ((to.path === '/' || to.path === '/login') && auth.isLoggedIn) {
    return '/home'
  }
})

export default router
