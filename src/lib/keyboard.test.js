import { describe, it, expect } from 'vitest';
import { isTextEntryTarget } from './keyboard';

describe('isTextEntryTarget', () => {
  it('true для contenteditable — текст на холсте и ячейки таблицы', () => {
    expect(isTextEntryTarget({ isContentEditable: true, tagName: 'DIV' })).toBe(true);
    expect(isTextEntryTarget({ isContentEditable: true, tagName: 'TD' })).toBe(true);
  });

  it('true для полей ввода в панелях', () => {
    expect(isTextEntryTarget({ tagName: 'INPUT' })).toBe(true);
    expect(isTextEntryTarget({ tagName: 'TEXTAREA' })).toBe(true);
  });

  it('false для обычных элементов — Delete удаляет элемент холста', () => {
    expect(isTextEntryTarget({ tagName: 'DIV', isContentEditable: false })).toBe(false);
    expect(isTextEntryTarget({ tagName: 'BUTTON' })).toBe(false);
  });

  it('false без цели события', () => {
    expect(isTextEntryTarget(null)).toBe(false);
    expect(isTextEntryTarget(undefined)).toBe(false);
  });
});
