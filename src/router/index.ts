import { RouteRecordRaw } from 'vue-router'

// Import views
import TheHomePage from '../views/TheHomePage.vue'
import TheDocumentPage from '../views/TheDocumentPage.vue'
import TheSealedDocumentPage from '../views/TheSealedDocumentPage.vue'
import TheVerificationPage from '../views/TheVerificationPage.vue'
import NotFoundPage from '../views/NotFoundPage.vue'

const routes: RouteRecordRaw[] = [
  {
    path: '/',
    name: 'home',
    component: TheHomePage,
    meta: {
      title: 'seal.codes - Digital Document Sealing',
    },
  },
  {
    path: '/document',
    name: 'document',
    component: TheDocumentPage,
    meta: {
      title: 'Load Your Document - seal.codes',
    },
  },
  {
    path: '/sealed/:documentId',
    name: 'sealed-document',
    component: TheSealedDocumentPage,
    meta: {
      title: 'Your Sealed Document - seal.codes',
    },
  },
  {
    path: '/v/:encodedData?',
    name: 'verification',
    component: TheVerificationPage,
    meta: {
      title: 'Document Verification - seal.codes',
    },
  },
  {
    path: '/verify',
    name: 'verify-alias',
    component: TheVerificationPage,
    meta: {
      title: 'Document Verification - seal.codes',
    },
  },
  {
    path: '/:pathMatch(.*)*',
    name: 'not-found',
    component: NotFoundPage,
    meta: {
      title: 'Page Not Found - seal.codes',
    },
  },
]

export default routes