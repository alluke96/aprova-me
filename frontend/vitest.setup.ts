import '@testing-library/jest-dom/vitest';
import { cleanup } from '@testing-library/react';
import { afterEach, vi } from 'vitest';

// `server-only` quebra fora do servidor do Next; nos testes ele não faz nada.
vi.mock('server-only', () => ({}));

afterEach(() => cleanup());
