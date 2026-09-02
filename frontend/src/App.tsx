import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Landing from './pages/Landing';
import Sidebar from './components/Sidebar';
import Inicio from './pages/Inicio';
import Empleados from './pages/Empleados';
import Notificaciones from './pages/Notificaciones';
import SystemStats from './pages/SystemStats';
import Admin from './pages/Admin';
import Comunidad from './pages/Comunidad';
import Accesos from './pages/Accesos';
import Finanzas from './pages/Finanzas';
import ProtectedRoute from './components/ProtectedRoute';
import './App.css';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<Landing />} />
        <Route path="/" element={<Landing />} />
        <Route path="/*" element={
          <ProtectedRoute>
            <div className="app">
              <Sidebar />
              <div className="main-content">
                <Routes>
                  <Route path="/inicio" element={<Inicio />} />
                  <Route path="/empleados" element={<Empleados />} />
                  <Route path="/notificaciones" element={<Notificaciones />} />
                  <Route path="/comunidad" element={<Comunidad />} />
                  <Route path="/accesos" element={<Accesos />} />
                  <Route path="/finanzas" element={<Finanzas />} />
                  <Route path="/system-stats" element={<SystemStats />} />
                  <Route path="/admin" element={<Admin />} />
                </Routes>
              </div>
            </div>
          </ProtectedRoute>
        } />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
