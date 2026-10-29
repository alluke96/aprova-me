import { documentMask, phoneMask, remask } from './mask';

describe('documentMask', () => {
  it.each([
    ['', ''],
    ['529', '529'],
    ['5299', '529.9'],
    ['5299822', '529.982.2'],
    ['529982247', '529.982.247'],
    ['5299822472', '529.982.247-2'],
    ['52998224725', '529.982.247-25'],
    ['112223330001', '11.222.333/0001'],
    ['11222333000181', '11.222.333/0001-81'],
    ['11.222.333/0001-81', '11.222.333/0001-81'],
    ['112223330001819', '11.222.333/0001-81'],
  ])('%s → %s', (input, expected) => {
    expect(documentMask.format(input)).toBe(expected);
  });

  it('vira CNPJ assim que aparece uma letra, já em maiúscula', () => {
    expect(documentMask.format('12abc')).toBe('12.ABC');
    expect(documentMask.format('12abc34501de35')).toBe('12.ABC.345/01DE-35');
  });

  it('ignora o que não é letra nem dígito', () => {
    expect(documentMask.format(' 529 982 247 25 ')).toBe('529.982.247-25');
  });
});

describe('phoneMask', () => {
  it.each([
    ['', ''],
    ['4', '(4'],
    ['41', '(41'],
    ['413', '(41) 3'],
    ['413333', '(41) 3333'],
    ['4133330', '(41) 3333-0'],
    ['4133330000', '(41) 3333-0000'],
    ['41999990000', '(41) 99999-0000'],
    ['419999900001', '(41) 99999-0000'],
    ['+55 41 99999-0000', '(41) 99999-0000'],
    ['(41) 3333-0000', '(41) 3333-0000'],
  ])('%s → %s', (input, expected) => {
    expect(phoneMask.format(input)).toBe(expected);
  });

  it('ignora letras', () => {
    expect(phoneMask.format('41a3')).toBe('(41) 3');
  });
});

describe('remask', () => {
  it('mantém o cursor depois do que foi digitado no meio do texto', () => {
    // "529.982.247-2" com "9" digitado depois do "529" (cursor na posição 4).
    const result = remask(documentMask, '5299.982.247-2', 4, '529.982.247-2', 'insertText');
    expect(result).toEqual({ value: '529.998.224-72', caret: 5 });
  });

  it('põe o cursor depois da pontuação que a máscara acrescentou', () => {
    expect(remask(documentMask, '5299', 4, '529', 'insertText')).toEqual({
      value: '529.9',
      caret: 5,
    });
  });

  it('backspace em cima do separador apaga o dígito antes dele', () => {
    // Cursor logo depois do "-" em "529.982.247-25": o navegador tira só o "-".
    const result = remask(
      documentMask,
      '529.982.24725',
      11,
      '529.982.247-25',
      'deleteContentBackward',
    );
    expect(result).toEqual({ value: '529.982.242-5', caret: 10 });
  });

  it('delete em cima do separador apaga o dígito depois dele', () => {
    // Cursor logo antes do "-" em "529.982.247-25": o navegador tira só o "-".
    const result = remask(
      documentMask,
      '529.982.24725',
      11,
      '529.982.247-25',
      'deleteContentForward',
    );
    expect(result).toEqual({ value: '529.982.247-5', caret: 11 });
  });

  it('backspace normal só apaga o dígito', () => {
    const previous = '(41) 3333-0000';
    const result = remask(phoneMask, '(41) 3333-000', 13, previous, 'deleteContentBackward');
    expect(result).toEqual({ value: '(41) 3333-000', caret: 13 });
  });

  it('ignora caractere que a máscara não aceita sem mexer no cursor', () => {
    expect(remask(phoneMask, '(41) 3a', 6, '(41) 3', 'insertText')).toEqual({
      value: '(41) 3',
      caret: 6,
    });
  });

  it('colar o número inteiro deixa o cursor no fim', () => {
    expect(remask(phoneMask, '+55 41 99999-0000', 17, '', 'insertFromPaste')).toEqual({
      value: '(41) 99999-0000',
      caret: 15,
    });
  });
});
