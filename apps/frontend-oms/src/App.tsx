import { AppRouter } from '../src/routes/AppRouter';
import { AuthProvider } from './auth/AuthContext';

import './App.css'

function App() {
  return (
    <AuthProvider>
      <AppRouter />
    </AuthProvider>
  )
}

export default App
