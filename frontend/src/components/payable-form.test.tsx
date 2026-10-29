import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { PayableForm } from './payable-form';

vi.mock('next/link', () => ({
  default: ({ href, children, ...rest }: { href: string; children: React.ReactNode }) => (
    <a href={href} {...rest}>
      {children}
    </a>
  ),
}));

const assignors = [{ value: '6f1c2a7e-2f7a-4b8e-9c55-0f6a3b9e1d10', label: 'Padaria São João' }];

describe('PayableForm', () => {
  it('não envia com campos vazios e mostra o motivo em cada campo', async () => {
    const action = vi.fn().mockResolvedValue({});
    const user = userEvent.setup();
    render(<PayableForm action={action} assignors={assignors} mode="create" />);

    await user.click(screen.getByRole('button', { name: 'Cadastrar recebível' }));

    expect(action).not.toHaveBeenCalled();
    expect(screen.getByText('Escolha um cedente')).toBeInTheDocument();
    expect(screen.getByText('Informe o valor')).toBeInTheDocument();
    expect(screen.getByText('Informe a data de emissão')).toBeInTheDocument();
    expect(screen.getByLabelText('Valor (R$)')).toHaveAttribute('aria-invalid', 'true');
  });

  it('tira o erro do campo assim que a pessoa começa a corrigir', async () => {
    const user = userEvent.setup();
    render(<PayableForm action={vi.fn()} assignors={assignors} mode="create" />);

    await user.click(screen.getByRole('button', { name: 'Cadastrar recebível' }));
    expect(screen.getByText('Informe o valor')).toBeInTheDocument();

    await user.type(screen.getByLabelText('Valor (R$)'), '1');

    expect(screen.queryByText('Informe o valor')).not.toBeInTheDocument();
    expect(screen.getByLabelText('Valor (R$)')).toHaveAttribute('aria-invalid', 'false');
    expect(screen.getByText('Informe a data de emissão')).toBeInTheDocument();
  });

  it('recusa valor fora das regras', async () => {
    const action = vi.fn().mockResolvedValue({});
    const user = userEvent.setup();
    render(<PayableForm action={action} assignors={assignors} mode="create" />);

    await user.type(screen.getByLabelText('Valor (R$)'), '10,555');
    await user.click(screen.getByRole('button', { name: 'Cadastrar recebível' }));

    expect(action).not.toHaveBeenCalled();
    expect(screen.getByText('Use um valor maior que zero, ex.: 1.500,50')).toBeInTheDocument();
  });

  it('envia os dados válidos com um id gerado na tela', async () => {
    const action = vi.fn().mockResolvedValue({});
    const user = userEvent.setup();
    render(<PayableForm action={action} assignors={assignors} mode="create" />);

    await user.type(screen.getByRole('combobox'), 'padaria');
    await user.click(screen.getByRole('option'));
    await user.type(screen.getByLabelText('Valor (R$)'), '1.500,50');
    fireEvent.change(screen.getByLabelText('Data de emissão'), { target: { value: '2026-10-28' } });
    await user.click(screen.getByRole('button', { name: 'Cadastrar recebível' }));

    await waitFor(() => expect(action).toHaveBeenCalledTimes(1));
    const formData: FormData = action.mock.calls[0][1];
    expect(formData.get('id')).toMatch(/^[0-9a-f-]{36}$/);
    expect(formData.get('assignor')).toBe(assignors[0].value);
    expect(formData.get('value')).toBe('1.500,50');
  });

  it('mostra os erros que vieram da API', async () => {
    const action = vi.fn().mockResolvedValue({
      message: 'Dados inválidos',
      fieldErrors: { value: ['valor recusado pela API'] },
    });
    const user = userEvent.setup();
    render(
      <PayableForm
        action={action}
        assignors={assignors}
        mode="edit"
        defaults={{
          id: 'b3d4c5e6-7f80-4a1b-9c2d-3e4f5a6b7c8d',
          value: '10,00',
          emissionDate: '2026-10-28',
          assignor: assignors[0].value,
        }}
      />,
    );

    await user.click(screen.getByRole('button', { name: 'Salvar alterações' }));

    expect(await screen.findByText('valor recusado pela API')).toBeInTheDocument();
    expect(screen.getByText('Dados inválidos')).toBeInTheDocument();
  });
});
