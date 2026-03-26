import { createRouter, createWebHistory } from 'vue-router'

const routes = [
  {
    path: '/',
    redirect: () => {
      return localStorage.getItem('onboardingCompleted') ? '/start' : '/auth'
    }
  },
  {
    path: '/auth',
    component: () => import('../layouts/OnboardingLayout.vue'),
    children: [
      { path: '', component: () => import('../pages/AuthPage.vue') }
    ]
  },
  {
    path: '/start',
    component: () => import('../layouts/MainLayout.vue'),
    children: [
      { path: '', component: () => import('../pages/StartPage.vue') }
    ]
  },
  {
    path: '/transcript/:id',
    component: () => import('../layouts/MainLayout.vue'),
    children: [
      { path: '', component: () => import('../pages/TranscriptPage.vue') }
    ]
  }
]

const router = createRouter({
  history: createWebHistory(),
  routes
})

export default router
