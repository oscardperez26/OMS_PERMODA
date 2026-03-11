import { AppRouter } from '../src/routes/AppRouter';
import { AuthProvider } from './auth/AuthContext';
import { BrandingProvider } from './branding/BrandingContext';



function App() {
  return (
    <AuthProvider>
      <BrandingProvider>
        <AppRouter />
      </BrandingProvider>
    </AuthProvider>
  )
}

export default App
