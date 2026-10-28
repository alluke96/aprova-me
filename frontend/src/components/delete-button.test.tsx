import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { DeleteButton } from './delete-button';

describe('DeleteButton', () => {
  it('só exclui depois de confirmar', async () => {
    const action = vi.fn().mockResolvedValue(undefined);
    const confirm = vi.spyOn(window, 'confirm');
    const user = userEvent.setup();
    render(<DeleteButton action={action} confirmation="Excluir este recebível?" />);

    confirm.mockReturnValueOnce(false);
    await user.click(screen.getByRole('button', { name: 'Excluir' }));
    expect(action).not.toHaveBeenCalled();

    confirm.mockReturnValueOnce(true);
    await user.click(screen.getByRole('button', { name: 'Excluir' }));
    expect(confirm).toHaveBeenLastCalledWith('Excluir este recebível?');
    expect(action).toHaveBeenCalledTimes(1);
  });
});
