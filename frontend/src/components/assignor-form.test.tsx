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

  it('pontua CPF, CNPJ e telefone enquanto a pessoa digita', async () => {
    const user = userEvent.setup();
    render(<AssignorForm action={vi.fn()} />);
    const document = screen.getByLabelText('CPF ou CNPJ');
    const phone = screen.getByLabelText('Telefone');

    await user.type(document, '52998224725');
    expect(document).toHaveValue('529.982.247-25');

    await user.type(document, '123');
    expect(document).toHaveValue('52.998.224/7251-23');

    await user.clear(document);
    await user.type(document, '12abc34501de35');
    expect(document).toHaveValue('12.ABC.345/01DE-35');

    await user.type(phone, '41999990000');
    expect(phone).toHaveValue('(41) 99999-0000');
  });

  it('apaga o dígito antes da pontuação e corrige no meio sem o cursor pular', async () => {
    const user = userEvent.setup();
    render(<AssignorForm action={vi.fn()} />);
    const document = screen.getByLabelText('CPF ou CNPJ') as HTMLInputElement;

    await user.type(document, '52998224725');
    // Cursor logo depois do "-": o backspace apaga o "7", não só o traço.
    document.setSelectionRange(12, 12);
    await user.keyboard('{Backspace}');
    expect(document).toHaveValue('529.982.242-5');

    await user.keyboard('7');
    expect(document).toHaveValue('529.982.247-25');
    expect(document.selectionStart).toBe(11);
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
