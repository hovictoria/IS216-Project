import { createRouter, createWebHistory } from 'vue-router'
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
      component: menu
    },
    {
      path: "/profile",
      component: profile
    },
    {
      path: "/games",
      component: games
    },
    {
      path: "/map",
      component: map
    },
    {
      path: "/collection",
      component: collection
    },
    {
      path: "/object",
      component: object
    },
    {
      path: "/memory",
      component: memory
    },
    {
      path: "/sequence",
      component: sequence
    },
    {
      path: "/pattern",
      component: pattern
    },
    {
      path: "/missing",
      component: missing
    },
    {
      path: "/oddoneout",
      component: oddoneout
    }
  ],
})

export default router
