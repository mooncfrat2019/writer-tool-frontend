import type { components } from './schema';

export type Problem = components['schemas']['Problem'];

export class ApiError extends Error {
  readonly problem: Problem;

  constructor(problem: Problem) {
    super(problem.title);
    this.name = 'ApiError';
    this.problem = problem;
  }
}

type ApiResult<T> = {
  data?: T;
  error?: Problem;
  response: Response;
};

export async function unwrap<T>(result: ApiResult<T>): Promise<T> {
  if (result.error) {
    throw new ApiError(result.error);
  }
  if (result.data === undefined) {
    throw new Error(`Empty API response (${result.response.status})`);
  }
  return result.data;
}
