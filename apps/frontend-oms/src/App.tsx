import { AppRouter } from '../src/routes/AppRouter';
import { AuthProvider } from './auth/AuthContext';



function App() {
  return (
    <AuthProvider>
      <AppRouter />
    </AuthProvider>
  )
}

export default App
