import { createRouter, createWebHistory } from 'vue-router'
import menu from "../components/menu.vue"
import profile from "../components/profile.vue"
import games from "../components/games.vue"
import map from "../components/map.vue"
import collection from "../components/charactercollection.vue"

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
    }
  ],
})

export default router
