import { createRouter, createWebHistory } from 'vue-router'
import { useAuthStore } from '@/stores/auth'

/* Auth - Landing, Login, SignUp */
import landing from "@/components/auth/landing.vue"
import login from "@/components/auth/login.vue"
import signup from "@/components/auth/signup.vue"

/* Home Page menu dashboard */
import menu from "../components/menu.vue"

/* Games */
import games from "../components/games/games.vue"
import memory from "../components/games/memory.vue"
import object from "../components/games/object.vue"
import sequence from "../components/games/sequence.vue"
import pattern from "../components/games/pattern.vue"
import missing from "../components/games/missing.vue"
import oddoneout from "../components/games/oddoneout.vue"


const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    // The following routes are for authentication, login & signUp
    {
      path: "/",
      component: landing
    },
    {
      path: "/login",
      component: login
    },
    {
      path: "/signup",
      component: signup
    },

    // The following route are for menu dashboard
    {
      path: "/menu",
      component: menu,
      meta: { requiresAuth: true }
    }

  ],
})

// Runs before every page change. 'to' is where the user is trying to go
router.beforeEach((to) => {
  const auth = useAuthStore() // here we are using auth's const isLoggedIn

  // Logged out and heading somewhere protected: directed to sign in first
  if (to.meta.requiresAuth && !auth.isLoggedIn) {
    return '/login'
  }

  // Already logged in: skip the landing & login page (goes straight to menu dashboard)
  if ((to.path === '/login' || to.path === '/' || to.path === '/signup') && auth.isLoggedIn) {
    return '/menu'
  }

})

export default router
