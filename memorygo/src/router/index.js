import { createRouter, createWebHistory } from 'vue-router'

/* Auth - Landing, Login, SignUp */
import landing from "@/components/auth/landing.vue"
import login from "@/components/auth/login.vue"

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

    // The following routes are for xxx
    {
      path: "/menu",
      component: menu
    }
  ],
})

export default router
