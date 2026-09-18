// Глобальные горячие клавиши не должны срабатывать,
// когда пользователь набирает текст: Delete в contenteditable
// или в поле ввода стирает символ, а не элемент холста.
export const isTextEntryTarget = (target) => {
  if (!target) return false;

  return Boolean(target.isContentEditable)
    || target.tagName === 'INPUT'
    || target.tagName === 'TEXTAREA';
};
