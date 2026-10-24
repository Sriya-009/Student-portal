import { BrowserRouter } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';
import AppRoutes from './routes';
import ChatbotWidget from './components/shared/ChatbotWidget';

function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <BrowserRouter>
          <AppRoutes />
          <ChatbotWidget />
        </BrowserRouter>
      </AuthProvider>
    </ThemeProvider>
  );
}

export default App;
