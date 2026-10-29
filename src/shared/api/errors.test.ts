import { describe, expect, it } from 'vitest';
import { getApiErrorMessage } from './errors';
import { ApiError, type Problem } from './request';

function problem(overrides: Partial<Problem>): Problem {
  return {
    type: 'about:blank',
    title: 'Forbidden',
    status: 403,
    code: 'forbidden',
    ...overrides,
  };
}

describe('getApiErrorMessage', () => {
  it('explains that image uploads are disabled', () => {
    const error = new ApiError(problem({ code: 'image_uploads_disabled' }));
    expect(getApiErrorMessage(error)).toBe(
      'Загрузка файлов отключена. Прикрепите изображение по прямой ссылке.',
    );
  });

  it('keeps the generic forbidden message for other 403 problems', () => {
    const error = new ApiError(problem({}));
    expect(getApiErrorMessage(error)).toBe(
      'Недостаточно прав для этого действия.',
    );
  });
});
