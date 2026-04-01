import { createRouter, createWebHistory } from 'vue-router'

const routes = [
  {
    path: '/',
    component: () => import('../layouts/MinimalLayout.vue'),
    children: [
      { path: '', component: () => import('../pages/LocalTranscribePage.vue') },
    ],
  },
  {
    path: '/p',
    redirect: () => {
      return localStorage.getItem('onboardingCompleted') ? '/p/start' : '/p/auth'
    },
  },
  {
    path: '/p/auth',
    component: () => import('../layouts/OnboardingLayout.vue'),
    children: [{ path: '', component: () => import('../pages/AuthPage.vue') }],
  },
  {
    path: '/p/start',
    component: () => import('../layouts/MainLayout.vue'),
    children: [{ path: '', component: () => import('../pages/StartPage.vue') }],
  },
  {
    path: '/p/transcript/:id',
    component: () => import('../layouts/MainLayout.vue'),
    children: [{ path: '', component: () => import('../pages/TranscriptPage.vue') }],
  },
]

const router = createRouter({
  history: createWebHistory(),
  routes,
})

export default router
