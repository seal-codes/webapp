import { RouteRecordRaw } from 'vue-router'

// Import views
import TheHomePage from '../views/TheHomePage.vue'
import TheDocumentPage from '../views/TheDocumentPage.vue'
import TheSealedDocumentPage from '../views/TheSealedDocumentPage.vue'
import TheVerificationPage from '../views/TheVerificationPage.vue'
import AuthCallbackPage from '../views/AuthCallbackPage.vue'
import FaqPage from '../views/FaqPage.vue'
import HackathonPage from '../views/HackathonPage.vue'
import NotFoundPage from '../views/NotFoundPage.vue'

// Import legal pages
import ImpressumPage from '../views/legal/ImpressumPage.vue'
import PrivacyPolicyPage from '../views/legal/PrivacyPolicyPage.vue'
import TermsOfServicePage from '../views/legal/TermsOfServicePage.vue'
import DisclaimerPage from '../views/legal/DisclaimerPage.vue'

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
    path: '/faq',
    name: 'faq',
    component: FaqPage,
    meta: {
      title: 'FAQ - seal.codes',
    },
  },
  {
    path: '/auth/callback',
    name: 'auth-callback',
    component: AuthCallbackPage,
    meta: {
      title: 'Completing Authentication - seal.codes',
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
    path: '/hackathon',
    name: 'hackathon',
    component: HackathonPage,
    meta: {
      title: 'Hackathon Showcase - seal.codes',
    },
  },
  {
    path: '/legal/impressum',
    name: 'legal-impressum',
    component: ImpressumPage,
    meta: {
      title: 'Impressum - seal.codes',
    },
  },
  {
    path: '/legal/privacy',
    name: 'legal-privacy',
    component: PrivacyPolicyPage,
    meta: {
      title: 'Privacy Policy - seal.codes',
    },
  },
  {
    path: '/legal/terms',
    name: 'legal-terms',
    component: TermsOfServicePage,
    meta: {
      title: 'Terms of Service - seal.codes',
    },
  },
  {
    path: '/legal/disclaimer',
    name: 'legal-disclaimer',
    component: DisclaimerPage,
    meta: {
      title: 'Disclaimer - seal.codes',
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