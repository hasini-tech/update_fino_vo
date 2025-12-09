import { createRouter, createWebHistory } from 'vue-router';
import ProjectsView from '@/views/ProjectsView.vue';

const routes = [
  // ... other routes
  {
    path: '/projects',
    name: 'Projects',
    component: ProjectsView
  },
  {
    path: '/projects/:id',
    name: 'ProjectDetail',
    component: ProjectsView,
    props: true
  }
];

const router = createRouter({
  history: createWebHistory(),
  routes
});

export default router;