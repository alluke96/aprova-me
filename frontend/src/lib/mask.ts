/**
 * Máscaras aplicadas enquanto a pessoa digita. Cada máscara diz quais
 * caracteres importam (`accepts`) e como pontuá-los (`format`); o resto é
 * pontuação que a própria máscara põe e tira.
 */
export interface Mask {
  accepts: RegExp;
  format: (input: string) => string;
}

/** Junta os caracteres em grupos, pondo o separador só quando o grupo começa. */
function group(chars: string, groups: ReadonlyArray<readonly [size: number, separator: string]>) {
  let output = '';
  let start = 0;
  for (const [size, separator] of groups) {
    if (start >= chars.length) break;
    output += separator + chars.slice(start, start + size);
    start += size;
  }
  return output;
}

const CPF_GROUPS = [[3, ''], [3, '.'], [3, '.'], [2, '-']] as const;
const CNPJ_GROUPS = [[2, ''], [3, '.'], [3, '.'], [4, '/'], [2, '-']] as const;

/**
 * CPF e CNPJ dividem o campo: até 11 dígitos é CPF, depois disso (ou com letra,
 * no CNPJ alfanumérico) vira CNPJ.
 */
export const documentMask: Mask = {
  accepts: /[0-9A-Za-z]/,
  format(input) {
    const chars = input.replace(/[^0-9A-Za-z]/g, '').toUpperCase().slice(0, 14);
    const isCpf = chars.length <= 11 && /^\d*$/.test(chars);
    return group(chars, isCpf ? CPF_GROUPS : CNPJ_GROUPS);
  },
};

const LANDLINE_GROUPS = [[2, '('], [4, ') '], [4, '-']] as const;
const MOBILE_GROUPS = [[2, '('], [5, ') '], [4, '-']] as const;

/** (41) 3333-0000 para fixo e (41) 99999-0000 para celular. */
export const phoneMask: Mask = {
  accepts: /\d/,
  format(input) {
    let digits = input.replace(/\D/g, '');
    // Colado com o código do país ("+55 41 99999-0000"): o 55 não cabe na máscara.
    if (digits.length > 11 && digits.startsWith('55')) digits = digits.slice(2);
    digits = digits.slice(0, 11);
    return group(digits, digits.length > 10 ? MOBILE_GROUPS : LANDLINE_GROUPS);
  },
};

function countAccepted(mask: Mask, text: string): number {
  return [...text].filter((char) => mask.accepts.test(char)).length;
}

/** Posição logo depois do n-ésimo caractere que importa. */
function positionAfter(mask: Mask, text: string, count: number): number {
  if (count === 0) return 0;
  let seen = 0;
  for (let index = 0; index < text.length; index++) {
    if (mask.accepts.test(text[index]) && ++seen === count) return index + 1;
  }
  return text.length;
}

/**
 * Remascara o que está no campo e diz onde o cursor fica, para editar no meio
 * do texto sem o cursor pular para o fim.
 *
 * Apagar só a pontuação não mudaria nada (a máscara a poria de volta), então o
 * backspace ou o delete em cima de um separador apaga o caractere ao lado dele.
 */
export function remask(
  mask: Mask,
  input: string,
  caret: number,
  previous: string,
  inputType?: string,
): { value: string; caret: number } {
  let text = input;
  let position = caret;

  if (mask.format(text) === previous) {
    if (inputType === 'deleteContentBackward') {
      const index = [...text.slice(0, position)].findLastIndex((char) => mask.accepts.test(char));
      if (index >= 0) {
        text = text.slice(0, index) + text.slice(index + 1);
        position = index;
      }
    } else if (inputType === 'deleteContentForward') {
      const offset = [...text.slice(position)].findIndex((char) => mask.accepts.test(char));
      if (offset >= 0) text = text.slice(0, position + offset) + text.slice(position + offset + 1);
    }
  }

  const value = mask.format(text);
  return { value, caret: positionAfter(mask, value, countAccepted(mask, text.slice(0, position))) };
}

/**
 * Aplica a máscara no `onChange` de um input controlado. Escreve o valor e o
 * cursor direto no campo: como o DOM já fica igual ao estado, o React não
 * mexe nele de novo e o cursor fica onde a pessoa estava digitando.
 */
export function maskInput(
  mask: Mask,
  event: React.ChangeEvent<HTMLInputElement>,
  previous: string,
): string {
  const input = event.target;
  const inputType = (event.nativeEvent as InputEvent).inputType;
  const { value, caret } = remask(
    mask,
    input.value,
    input.selectionStart ?? input.value.length,
    previous,
    inputType,
  );
  input.value = value;
  input.setSelectionRange(caret, caret);
  return value;
}
