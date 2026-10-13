import { createRouter, createWebHistory } from 'vue-router'

/* Auth - Landing, Login, SignUp */
import landing from "@/components/auth/landing.vue"

import menu from "../components/menu.vue"
import profile from "../components/profile.vue"
import games from "../components/games/games.vue"
import map from "../components/map.vue"
import collection from "../components/charactercollection.vue"
import memory from "../components/games/memory.vue"
import object from "../components/games/object.vue"
import sequence from "../components/games/sequence.vue"
import pattern from "../components/games/pattern.vue"
import missing from "../components/games/missing.vue"
import oddoneout from "../components/games/oddoneout.vue"


const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: "/",
      component: landing
    },
    {
      path: "/menu",
      component: menu
    }
  ],
})

export default router
