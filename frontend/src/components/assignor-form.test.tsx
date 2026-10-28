import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { AssignorForm } from './assignor-form';

vi.mock('next/link', () => ({
  default: ({ href, children }: { href: string; children: React.ReactNode }) => (
    <a href={href}>{children}</a>
  ),
}));

describe('AssignorForm', () => {
  it('bloqueia o envio e aponta os campos obrigatórios', async () => {
    const action = vi.fn().mockResolvedValue({});
    const user = userEvent.setup();
    render(<AssignorForm action={action} />);

    await user.click(screen.getByRole('button', { name: 'Cadastrar cedente' }));

    expect(action).not.toHaveBeenCalled();
    expect(screen.getByText('Informe o nome ou razão social')).toBeInTheDocument();
    expect(screen.getByText('Informe o CPF ou CNPJ')).toBeInTheDocument();
    expect(screen.getByText('Informe o telefone')).toBeInTheDocument();
    expect(screen.getByText('Informe o e-mail')).toBeInTheDocument();
  });

  it('impede digitar além do limite do enunciado', () => {
    render(<AssignorForm action={vi.fn()} />);

    expect(screen.getByLabelText('Nome ou razão social')).toHaveAttribute('maxLength', '140');
    expect(screen.getByLabelText('Telefone')).toHaveAttribute('maxLength', '20');
  });

  it('envia um cedente válido e informa a volta para o recebível', async () => {
    const action = vi.fn().mockResolvedValue({});
    const user = userEvent.setup();
    render(<AssignorForm action={action} returnTo="payable" />);

    await user.type(screen.getByLabelText('Nome ou razão social'), 'Padaria São João');
    await user.type(screen.getByLabelText('CPF ou CNPJ'), '11.222.333/0001-81');
    await user.type(screen.getByLabelText('Telefone'), '(41) 3333-0000');
    await user.type(screen.getByLabelText('E-mail'), 'contato@padaria.com');
    await user.click(screen.getByRole('button', { name: 'Cadastrar cedente' }));

    await waitFor(() => expect(action).toHaveBeenCalledTimes(1));
    const formData: FormData = action.mock.calls[0][1];
    expect(formData.get('returnTo')).toBe('payable');
    expect(formData.get('document')).toBe('11.222.333/0001-81');
  });
});
