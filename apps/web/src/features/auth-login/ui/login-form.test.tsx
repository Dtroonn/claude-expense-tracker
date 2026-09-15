import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { login } from '../api/login';
import { LoginForm } from './login-form';

vi.mock('../api/login', () => ({
  login: vi.fn(),
}));

const push = vi.fn();
const refresh = vi.fn();

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push, refresh }),
}));

const mockedLogin = vi.mocked(login);

describe('LoginForm', () => {
  beforeEach(() => {
    mockedLogin.mockReset();
    push.mockReset();
    refresh.mockReset();
  });

  it('renders email and password fields', () => {
    render(<LoginForm />);

    expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/password/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /sign in/i })).toBeInTheDocument();
  });

  it('shows validation errors for empty submission', async () => {
    const user = userEvent.setup();
    render(<LoginForm />);

    await user.click(screen.getByRole('button', { name: /sign in/i }));

    expect(await screen.findByText(/invalid email/i)).toBeInTheDocument();
    expect(mockedLogin).not.toHaveBeenCalled();
  });

  it('navigates home and refreshes on successful login', async () => {
    mockedLogin.mockResolvedValue({ ok: true } as Response);
    const user = userEvent.setup();
    render(<LoginForm />);

    await user.type(screen.getByLabelText(/email/i), 'user@example.com');
    await user.type(screen.getByLabelText(/password/i), 'password123');
    await user.click(screen.getByRole('button', { name: /sign in/i }));

    await waitFor(() => expect(push).toHaveBeenCalledWith('/'));
    expect(refresh).toHaveBeenCalled();
  });

  it('navigates to a relative "next" path on successful login', async () => {
    mockedLogin.mockResolvedValue({ ok: true } as Response);
    const user = userEvent.setup();
    render(<LoginForm next="/profile" />);

    await user.type(screen.getByLabelText(/email/i), 'user@example.com');
    await user.type(screen.getByLabelText(/password/i), 'password123');
    await user.click(screen.getByRole('button', { name: /sign in/i }));

    await waitFor(() => expect(push).toHaveBeenCalledWith('/profile'));
  });

  it('ignores an unsafe "next" path and falls back home', async () => {
    mockedLogin.mockResolvedValue({ ok: true } as Response);
    const user = userEvent.setup();
    render(<LoginForm next="https://evil.example.com" />);

    await user.type(screen.getByLabelText(/email/i), 'user@example.com');
    await user.type(screen.getByLabelText(/password/i), 'password123');
    await user.click(screen.getByRole('button', { name: /sign in/i }));

    await waitFor(() => expect(push).toHaveBeenCalledWith('/'));
  });

  it('shows a form-level error banner on invalid credentials without blaming a field', async () => {
    mockedLogin.mockResolvedValue({ ok: false } as Response);
    const user = userEvent.setup();
    render(<LoginForm />);

    await user.type(screen.getByLabelText(/email/i), 'user@example.com');
    await user.type(screen.getByLabelText(/password/i), 'wrong-password');
    await user.click(screen.getByRole('button', { name: /sign in/i }));

    expect(await screen.findByRole('alert')).toHaveTextContent(/invalid email or password/i);
    expect(push).not.toHaveBeenCalled();
    expect(screen.getByLabelText(/email/i)).not.toHaveAttribute('aria-invalid', 'true');
    expect(screen.getByLabelText(/password/i)).not.toHaveAttribute('aria-invalid', 'true');
  });
});
