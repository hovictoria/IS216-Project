import { createRouter, createWebHistory } from 'vue-router'
import { useAuthStore } from '../stores/auth'
import { checkMood } from '../lib/useMood'

/* Auth - Landing, Login, SignUp */
import landing from "../components/auth/landing.vue"
import login from "../components/auth/login.vue"
import signup from "../components/auth/signup.vue"


/* Games */
import memory from "../views/games/memory.vue"
import object from "../views/games/object.vue"
import sequence from "../views/games/sequence.vue"
import pattern from "../views/games/pattern.vue"
import missing from "../views/games/missing.vue"
import oddoneout from "../views/games/oddoneout.vue"

/* Collection */
import collection from "../components/charactercollection.vue"
import spirit from "../views/spirit.vue"

/* Journey tab */
import journeyView from "../views/journey.vue"

/* Map */
import mapView from "../views/map.vue" 

/* Profile */
import profile from "../views/profile.vue"

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
    {
      path: "/games",
      component: memory
    },
    {
      // the old dashboard was removed; old links land on the Journey tab instead
      path: "/menu",
      redirect: "/journey"
    },
    {
      path: "/spirits",
      component: collection,
      meta: { requiresAuth: true }
    },
    {
      path: "/spirits/:id",
      component: spirit,
      meta: { requiresAuth: true }
    },
    {
      path: "/journey",
      component: journeyView,
      meta: { requiresAuth: true }
    },
    {
      path: "/map",
      component: mapView,
      meta: { requiresAuth: true }
    }, 
    {
      path: "/me",
      component: profile,
      meta: {requiresAuth: true}
    },
    {
      path: "/games/memory",
      component: memory,
      meta: { requiresAuth: true }
    },
    { path: "/games/object",
      component: object,
      meta: { requiresAuth: true }
    },
    {
      path: "/games/oddoneout",
      component: oddoneout,
      meta: { requiresAuth: true }
    },
    { path: "/games/pattern",
      component: pattern,
      meta: { requiresAuth: true }
    },
    { path: "/games/missing",
      component: missing,
      meta: { requiresAuth: true }
    },
    { path: "/games/sequence",
      component: sequence,
      meta: { requiresAuth: true }
    },
  ],
})

// Runs before every page change. 'to' is where the user is trying to go
router.beforeEach((to) => {
  checkMood() // day or night look: look at the clock again (lib/useMood.js)

  const auth = useAuthStore() // here we are using auth's const isLoggedIn

  // Logged out and heading somewhere protected: directed to sign in first
  if (to.meta.requiresAuth && !auth.isLoggedIn) {
    return '/login'
  }

  // Already logged in: skip the landing & login page (goes straight to the map)
  if ((to.path === '/login' || to.path === '/' || to.path === '/signup') && auth.isLoggedIn) {
    return '/map'
  }

})

export default router
