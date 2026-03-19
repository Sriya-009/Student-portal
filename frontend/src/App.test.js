import { render, screen } from '@testing-library/react';
import App from './App';

test('renders login page', () => {
  render(<App />);
  const headingElement = screen.getByRole('heading', { name: /login/i });
  expect(headingElement).toBeInTheDocument();
  const loginButton = screen.getByRole('button', { name: /login/i });
  expect(loginButton).toBeInTheDocument();
});
