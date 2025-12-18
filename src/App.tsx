import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Home } from './pages/Home';
import { Questionnaire } from './pages/Questionnaire';
import { Resultats } from './pages/Resultats';
import { Login } from './pages/Admin/Login';
import { ProtectedRoute } from './components/ProtectedRoute';
import { Dashboard } from './pages/Admin/Dashboard';
import { Evaluations } from './pages/Admin/Evaluations';
import { EvaluationDetail } from './pages/Admin/EvaluationDetail';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Routes publiques */}
        <Route path="/" element={<Home />} />
        <Route path="/questionnaire/:evaluationId" element={<Questionnaire />} />
        <Route path="/resultats/:evaluationId" element={<Resultats />} />

        {/* Routes admin - non protégées */}
        <Route path="/admin/login" element={<Login />} />

        {/* Routes admin - protégées */}
        <Route
          path="/admin"
          element={
            <ProtectedRoute>
              <Dashboard />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/evaluations"
          element={
            <ProtectedRoute>
              <Evaluations />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/evaluations/:id"
          element={
            <ProtectedRoute>
              <EvaluationDetail />
            </ProtectedRoute>
          }
        />

        {/* Redirection par défaut */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
