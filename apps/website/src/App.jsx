

import { useEffect } from 'react';
import './App.css'
import AppRouter from './router/AppRouter'
import { useCurrencyStore } from './store/useCurrencyStore';
import { Link } from 'react-router-dom';
import OrganizationSchema from './components/schema/OrganizationSchema';

function App() {
 const fetchRates = useCurrencyStore(
    (s) => s.fetchRates
  );

  useEffect(() => {
    // Delay well past LCP before fetching exchange rates (non-critical data).
    // requestIdleCallback with a short timeout fires as soon as React hydrates,
    // which puts it on the critical-path chain. A 8 s outer setTimeout ensures
    // the request only starts after the page is fully interactive.
    const timerId = setTimeout(() => {
      if (typeof requestIdleCallback !== "undefined") {
        requestIdleCallback(fetchRates);
      } else {
        fetchRates();
      }
    }, 8000);
    return () => clearTimeout(timerId);
  }, []);

  return (
   <main>
   <OrganizationSchema />
   <AppRouter />
   </main>
  )
}

export default App
