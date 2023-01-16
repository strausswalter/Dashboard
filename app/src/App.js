import './App.css';
import { lazy, Suspense, useState } from 'react';

import { AppBar } from './components'//importa apenas a pasta, pois dentro dela possui um index.js exportando os outros componentes

import {
  BrowserRouter as Router,
  Routes,
  Route
} from 'react-router-dom';

import Loading from './pages/Loading';

const Login = lazy(() => import('./pages/Login'))
const Documents = lazy(() => import('./pages/Documents'))
const Document = lazy(() => import('./pages/Document'))
const Register = lazy(() => import('./pages/Register'))

function App() {
  const [currentRoute, setCurrentRoute] = useState('/')

  return (
    <Router>

      { currentRoute !== '/login' && currentRoute !== '/register' ? <AppBar/> : "" } {/* Só mostra o Appbar se não estiver nas telas de login e registro. */}
      
      <Suspense fallback={<Loading/>}>
        <Routes>
          <Route exact path="/" element={<Documents setCurrentRoute={setCurrentRoute}/>}/> {/* passando para o componente a função que muda o estado da rota */}
          <Route exact path="/documents" element={<Documents setCurrentRoute={setCurrentRoute}/>}/>
          <Route exact path="/document" element={<Document setCurrentRoute={setCurrentRoute}/>}/>
          <Route path="/document/:id" element={<Document setCurrentRoute={setCurrentRoute}/>}/>
          <Route path="/login" element={<Login setCurrentRoute={setCurrentRoute}/>}/>
          <Route path="/register" element={<Register setCurrentRoute={setCurrentRoute}/>}/>
        </Routes>
      </Suspense>
    </Router>
  );
}

export default App;
