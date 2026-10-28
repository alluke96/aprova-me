import { act, render, screen } from '@testing-library/react';
import { SessionTimer } from './session-timer';

const replace = vi.fn();
vi.mock('next/navigation', () => ({ useRouter: () => ({ replace }) }));

describe('SessionTimer', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-10-28T12:00:00Z'));
    replace.mockClear();
  });

  afterEach(() => vi.useRealTimers());

  it('conta o tempo e manda para o login quando a sessão acaba', () => {
    render(<SessionTimer expiresAt={Date.now() + 60_000} />);
    act(() => vi.advanceTimersByTime(0));
    expect(screen.getByText('Sessão expira em 1:00')).toBeInTheDocument();

    act(() => vi.advanceTimersByTime(45_000));
    expect(screen.getByText('Sessão expira em 0:15')).toBeInTheDocument();
    expect(replace).not.toHaveBeenCalled();

    act(() => vi.advanceTimersByTime(15_000));
    expect(replace).toHaveBeenCalledWith('/login?expired=1');
  });
});
