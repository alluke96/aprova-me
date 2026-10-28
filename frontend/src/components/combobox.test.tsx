import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import { Combobox, type ComboboxOption } from './combobox';

const options: ComboboxOption[] = [
  { value: 'a', label: 'Padaria São João', description: '11.222.333/0001-81' },
  { value: 'b', label: 'Metalúrgica Iguaçu', description: '529.982.247-25' },
];

function Harness({ initial = '' }: { initial?: string }) {
  const [value, setValue] = useState(initial);
  return (
    <form aria-label="teste">
      <Combobox id="assignor" name="assignor" options={options} value={value} onChange={setValue} />
    </form>
  );
}

function hiddenValue() {
  return (screen.getByRole('form').querySelector('input[name="assignor"]') as HTMLInputElement)
    .value;
}

describe('Combobox', () => {
  it('filtra ignorando acentos e escolhe com o mouse', async () => {
    const user = userEvent.setup();
    render(<Harness />);

    await user.type(screen.getByRole('combobox'), 'sao');
    const items = screen.getAllByRole('option');
    expect(items).toHaveLength(1);

    await user.click(items[0]);
    expect(screen.getByRole('combobox')).toHaveValue('Padaria São João');
    expect(hiddenValue()).toBe('a');
  });

  it('busca também pelo documento', async () => {
    const user = userEvent.setup();
    render(<Harness />);

    await user.type(screen.getByRole('combobox'), '529.982');

    expect(screen.getByRole('option')).toHaveTextContent('Metalúrgica Iguaçu');
  });

  it('navega pelo teclado', async () => {
    const user = userEvent.setup();
    render(<Harness />);

    await user.click(screen.getByRole('combobox'));
    await user.keyboard('{ArrowDown}{Enter}');

    expect(hiddenValue()).toBe('b');
  });

  it('limpa a escolha quando o texto muda', async () => {
    const user = userEvent.setup();
    render(<Harness initial="a" />);

    expect(screen.getByRole('combobox')).toHaveValue('Padaria São João');
    await user.type(screen.getByRole('combobox'), 'x');

    expect(hiddenValue()).toBe('');
  });

  it('avisa quando nada combina', async () => {
    const user = userEvent.setup();
    render(<Harness />);

    await user.type(screen.getByRole('combobox'), 'zzz');

    expect(screen.getByText('Nenhum resultado')).toBeInTheDocument();
  });
});
