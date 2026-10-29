import { ApiError } from './request';

const statusMessages: Record<number, string> = {
  401: 'Сессия истекла. Войдите снова.',
  403: 'Недостаточно прав для этого действия.',
  404: 'Запись не найдена. Возможно, её уже удалили.',
  409: 'Кто-то уже изменил эти данные. Обновите страницу и попробуйте снова.',
  413: 'Файл слишком большой.',
  422: 'Проверьте заполнение полей и попробуйте снова.',
  429: 'Слишком много запросов. Попробуйте немного позже.',
};

export function getApiErrorMessage(
  error: unknown,
  fallback = 'Не удалось выполнить действие. Попробуйте ещё раз.',
): string {
  if (error instanceof ApiError) {
    if (error.problem.code === 'image_uploads_disabled') {
      return 'Загрузка файлов отключена. Прикрепите изображение по прямой ссылке.';
    }
    return statusMessages[error.problem.status] ?? fallback;
  }
  if (error instanceof TypeError) {
    return 'Нет связи с сервером. Проверьте подключение и попробуйте снова.';
  }
  return fallback;
}

export function isVersionConflict(error: unknown): boolean {
  return error instanceof ApiError && error.problem.status === 409;
}

export function getApiProblemCode(error: unknown): string | null {
  return error instanceof ApiError ? error.problem.code : null;
}
