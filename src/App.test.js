import { render, screen } from '@testing-library/react';
import App from './App';

test('renders login screen title', () => {
  render(<App />);
  const headingElement = screen.getByText(/student achievement portal/i);
  expect(headingElement).toBeInTheDocument();
  const signInButton = screen.getByRole('button', { name: /sign in as student/i });
  expect(signInButton).toBeInTheDocument();
});
