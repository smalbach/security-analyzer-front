import { BrowserRouter } from 'react-router-dom';
import { AppShell } from './components/app';
import { AuthProvider } from './contexts/AuthContext';
import { ThemeProvider } from './contexts/ThemeContext';

function App() {
  return (
    <ThemeProvider>
      <BrowserRouter>
        <AuthProvider>
          <AppShell />
        </AuthProvider>
      </BrowserRouter>
    </ThemeProvider>
  );
}

export default App;
