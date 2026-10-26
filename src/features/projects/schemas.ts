import { z } from 'zod';

export const projectFormSchema = z.object({
  title: z
    .string()
    .trim()
    .min(1, 'Введите название проекта')
    .max(200, 'Название не длиннее 200 символов'),
  genre: z.string().trim().max(100, 'Жанр не длиннее 100 символов'),
  description: z.string().trim().max(5000, 'Описание не длиннее 5000 символов'),
  language: z.enum(['ru', 'en']),
});

export type ProjectFormValues = z.infer<typeof projectFormSchema>;

export const projectFormDefaults: ProjectFormValues = {
  title: '',
  genre: '',
  description: '',
  language: 'ru',
};
