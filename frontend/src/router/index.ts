import { createRouter, createWebHistory } from 'vue-router';
import HomeView from '@/views/HomeView.vue';

const router = createRouter({
  history: createWebHistory(),
  routes: [
    { path: '/', name: 'home', component: HomeView, meta: { title: 'Find your next flight' } },
    {
      path: '/search',
      name: 'results',
      component: () => import('@/views/SearchResultsView.vue'),
      meta: { title: 'Search results' },
    },
    {
      path: '/flights/:offerId',
      name: 'flight-details',
      component: () => import('@/views/FlightDetailsView.vue'),
      props: true,
      meta: { title: 'Flight details' },
    },
    {
      path: '/book/:offerId/passengers',
      name: 'passengers',
      component: () => import('@/views/PassengerDetailsView.vue'),
      props: true,
      meta: { title: 'Passenger details' },
    },
    {
      path: '/book/:offerId/checkout',
      name: 'checkout',
      component: () => import('@/views/CheckoutView.vue'),
      props: true,
      meta: { title: 'Review and book' },
    },
    {
      path: '/booking/confirmation',
      name: 'confirmation',
      component: () => import('@/views/BookingConfirmationView.vue'),
      meta: { title: 'Booking confirmation' },
    },
    {
      path: '/booking/lookup',
      name: 'lookup',
      component: () => import('@/views/BookingLookupView.vue'),
      meta: { title: 'Find your booking' },
    },
    {
      path: '/:pathMatch(.*)*',
      name: 'not-found',
      component: () => import('@/views/NotFoundView.vue'),
      meta: { title: 'Page not found' },
    },
  ],
  scrollBehavior(_to, _from, saved) {
    return saved ?? { top: 0 };
  },
});

router.afterEach((to) => {
  document.title = `${(to.meta.title as string | undefined) ?? 'Flights'} · SkyRoute`;
});

export default router;
