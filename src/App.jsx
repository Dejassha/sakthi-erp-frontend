import { Suspense } from "react";
// UI Components
import {
  BrowserRouter,
  Navigate,
  Outlet,
  Route,
  Routes,
} from "react-router-dom";
// Contexts, Layouts & Config
import Layout from "./layouts/Layout";
import ProtectedRoute from "./Routes/ProtectedRoute";
import Loader from "./components/ReusableComponents/Loader";
import { protectedRoutes, publicRoutes } from "./Routes/routes.config";
import { ROUTES } from "./Routes/routes.constants";

const ProtectedLayout = ({ roles }) => {
  return (
    <ProtectedRoute roles={roles}>
      <Outlet />
    </ProtectedRoute>
  );
};

const App = () => (
  <BrowserRouter>
    <Layout>
      <Suspense fallback={<Loader />}>
        <Routes>
          {/* Public routes */}
          {publicRoutes.map(({ path, element }) => (
            <Route key={path} path={path} element={element} />
          ))}

          {/* Authenticated routes */}
          <Route element={<ProtectedLayout />}>
            {protectedRoutes.map(({ path, element, roles }) =>
              roles ? (
                <Route key={path} element={<ProtectedLayout roles={roles} />}>
                  <Route path={path} element={element} />
                </Route>
              ) : (
                <Route key={path} path={path} element={element} />
              ),
            )}
          </Route>
        </Routes>
      </Suspense>
    </Layout>
  </BrowserRouter>
);

export default App;
