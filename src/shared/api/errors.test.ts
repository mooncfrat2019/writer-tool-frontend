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
  it('explains that image uploads require Pro', () => {
    const error = new ApiError(problem({ code: 'image_uploads_pro_only' }));
    expect(getApiErrorMessage(error)).toBe(
      'Загрузка изображений доступна на тарифе Pro.',
    );
  });

  it('keeps the generic forbidden message for other 403 problems', () => {
    const error = new ApiError(problem({}));
    expect(getApiErrorMessage(error)).toBe(
      'Недостаточно прав для этого действия.',
    );
  });
});
