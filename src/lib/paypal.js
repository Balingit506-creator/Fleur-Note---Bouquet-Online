// PayPal's JavaScript SDK, loaded once and only when the support panel first needs it.
import { DONATE_CUR, PAYPAL_CLIENT_ID } from './donate.js';

let loading = null;
export function loadPayPal() {
  if (!PAYPAL_CLIENT_ID) return Promise.reject(new Error('No PayPal Client ID'));
  if (!loading) {
    loading = new Promise((resolve, reject) => {
      const u = new URL('https://www.paypal.com/sdk/js');
      u.searchParams.set('client-id', PAYPAL_CLIENT_ID);
      u.searchParams.set('currency', DONATE_CUR);
      u.searchParams.set('intent', 'capture');
      u.searchParams.set('components', 'buttons');
      u.searchParams.set('disable-funding', 'paylater,venmo'); // just PayPal + debit/credit card
      const s = document.createElement('script');
      s.src = u.href;
      s.async = true;
      s.onload = () => (window.paypal ? resolve(window.paypal) : reject(new Error('PayPal did not start')));
      s.onerror = () => { loading = null; reject(new Error('PayPal could not load')); };
      document.head.append(s);
    });
  }
  return loading;
}
