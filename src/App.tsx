import { lazy, Suspense } from 'react';
import { BrowserRouter, Route, Routes } from 'react-router-dom';
import SiteLayout from './components/SiteLayout';
import HomePage from './pages/HomePage';
import ArticlePage from './pages/ArticlePage';
import CategoryPage from './pages/CategoryPage';
import SearchPage from './pages/SearchPage';

const AdminDashboard = lazy(() => import('./pages/AdminDashboard'));

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<SiteLayout />}>
          <Route path="/" element={<HomePage />} />
          <Route path="/news/:slug" element={<ArticlePage />} />
          <Route path="/category/:slug" element={<CategoryPage />} />
          <Route path="/search" element={<SearchPage />} />
          <Route path="/admin" element={<Suspense fallback={<main role="status" className="mx-auto min-h-[60vh] max-w-lg px-4 py-20 text-center text-sm text-stone-600">Loading newsroom…</main>}><AdminDashboard /></Suspense>} />
          <Route path="/admin/*" element={<Suspense fallback={<main role="status" className="mx-auto min-h-[60vh] max-w-lg px-4 py-20 text-center text-sm text-stone-600">Loading newsroom…</main>}><AdminDashboard /></Suspense>} />
          <Route path="*" element={<HomePage />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;
