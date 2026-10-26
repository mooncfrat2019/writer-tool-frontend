import type { components } from '@/shared/api/schema';

type User = components['schemas']['User'];
type Project = components['schemas']['Project'];
type ProjectSummary = components['schemas']['ProjectSummary'];
type ProjectMember = components['schemas']['ProjectMember'];
type Book = components['schemas']['Book'];
type BookNode = components['schemas']['BookNode'];
type Document = components['schemas']['Document'];
type Character = components['schemas']['Character'];
type CharacterRelation = components['schemas']['CharacterRelation'];
type Attachment = components['schemas']['Attachment'];
type ExportJob = components['schemas']['ExportJob'];
type Asset = components['schemas']['Asset'];

const now = new Date('2026-10-26T12:00:00.000Z').toISOString();

export const mockUser: User = {
  id: '11111111-1111-4111-8111-111111111111',
  email: 'author@example.com',
  displayName: 'Анна Автор',
  avatarUrl: null,
  emailVerified: true,
  createdAt: now,
};

export const mockProjectSummary: ProjectSummary = {
  id: '22222222-2222-4222-8222-222222222222',
  title: 'Хроники Пепельной Луны',
  description:
    'Тёмное фэнтези о городе, который каждые семь лет теряет память, и о девушке, которая помнит всё.',
  genre: 'Тёмное фэнтези',
  language: 'ru',
  role: 'owner',
  membersCount: 2,
  booksCount: 1,
  wordCount: 12480,
  coverUrl: null,
  updatedAt: now,
};

export const mockProject: Project = {
  ...mockProjectSummary,
  settings: {},
  createdAt: now,
  version: 3,
};

export const mockMembers: ProjectMember[] = [
  {
    userId: mockUser.id,
    displayName: mockUser.displayName,
    email: mockUser.email,
    avatarUrl: null,
    role: 'owner',
    joinedAt: now,
  },
  {
    userId: '11111111-1111-4111-8111-111111111112',
    displayName: 'Илья Редактор',
    email: 'editor@example.com',
    avatarUrl: null,
    role: 'editor',
    joinedAt: now,
  },
];

export const mockBook: Book = {
  id: '33333333-3333-4333-8333-333333333333',
  projectId: mockProject.id,
  title: 'Книга первая. Пепел',
  subtitle: 'Хроники Пепельной Луны',
  seriesOrder: 1,
  status: 'drafting',
  synopsis:
    'Мира возвращается в город, где её никто не помнит, и находит список имён тех, кто должен исчезнуть.',
  coverUrl: null,
  targetWordCount: 120000,
  wordCount: 12480,
  language: 'ru',
  createdAt: now,
  updatedAt: now,
  version: 7,
};

export const mockDocument: Document = {
  id: '88888888-8888-4888-8888-888888888888',
  projectId: mockProject.id,
  kind: 'text',
  title: 'Глава 1. Пробуждение',
  wordCount: 812,
  version: 12,
  snapshotAt: now,
  updatedAt: now,
  canonical: {
    type: 'doc',
    content: [
      {
        type: 'heading',
        attrs: { level: 1 },
        content: [{ type: 'text', text: 'Глава 1. Пробуждение' }],
      },
      {
        type: 'paragraph',
        content: [
          {
            type: 'text',
            text: 'Город просыпался медленно, будто нехотя возвращался из чужого сна. Мира стояла на площади и смотрела, как первые лучи скользят по пепельным крышам.',
          },
        ],
      },
      {
        type: 'paragraph',
        content: [
          {
            type: 'text',
            text: 'Она помнила этот город другим. Помнила имена, лица, запах хлеба из пекарни на углу. Но сейчас на углу была только пустая витрина, а над дверью висела табличка: «Скоро открытие».',
          },
        ],
      },
      {
        type: 'blockquote',
        content: [
          {
            type: 'paragraph',
            content: [
              {
                type: 'text',
                text: '«Каждые семь лет город забывает. Каждые семь лет кто-то должен помнить».',
              },
            ],
          },
        ],
      },
      {
        type: 'paragraph',
        content: [
          {
            type: 'text',
            text: 'В кармане пальто лежал сложенный вчетверо лист. На нём было семь имён. Первое имя было её собственным.',
          },
        ],
      },
    ],
  },
};

export const mockNodes: BookNode[] = [
  {
    id: '44444444-4444-4444-8444-444444444444',
    bookId: mockBook.id,
    parentId: null,
    type: 'part',
    title: 'Часть I. Город, который забыл',
    synopsis: 'Мира возвращается в Пепельный город и понимает, что её никто не помнит.',
    notes: '',
    status: 'draft',
    sortKey: 'a0',
    targetWordCount: 40000,
    povCharacterId: null,
    documentId: null,
    wordCount: 12480,
    createdAt: now,
    updatedAt: now,
    version: 1,
    children: [
      {
        id: '55555555-5555-4555-8555-555555555555',
        bookId: mockBook.id,
        parentId: '44444444-4444-4444-8444-444444444444',
        type: 'chapter',
        title: 'Глава 1. Пробуждение',
        synopsis: 'Мира приходит на площадь и находит список имён.',
        notes: 'POV Мира. Первое появление списка.',
        status: 'draft',
        sortKey: 'a0',
        targetWordCount: 3500,
        povCharacterId: '99999999-9999-4999-8999-999999999999',
        documentId: mockDocument.id,
        wordCount: 812,
        createdAt: now,
        updatedAt: now,
        version: 4,
        children: [
          {
            id: '66666666-6666-4666-8666-666666666666',
            bookId: mockBook.id,
            parentId: '55555555-5555-4555-8555-555555555555',
            type: 'scene',
            title: 'Сцена 1. Площадь',
            synopsis: 'Мира вспоминает город, которого больше нет.',
            notes: '',
            status: 'draft',
            sortKey: 'a0',
            targetWordCount: 1500,
            povCharacterId: '99999999-9999-4999-8999-999999999999',
            documentId: '88888888-8888-4888-8888-888888888889',
            wordCount: 812,
            createdAt: now,
            updatedAt: now,
            version: 2,
          },
        ],
      },
      {
        id: '77777777-7777-4777-8777-777777777777',
        bookId: mockBook.id,
        parentId: '44444444-4444-4444-8444-444444444444',
        type: 'chapter',
        title: 'Глава 2. Список',
        synopsis: 'Мира пытается понять, кто оставил список и почему её имя первое.',
        notes: '',
        status: 'outline',
        sortKey: 'a1',
        targetWordCount: 4000,
        povCharacterId: '99999999-9999-4999-8999-999999999999',
        documentId: null,
        wordCount: 0,
        createdAt: now,
        updatedAt: now,
        version: 1,
      },
    ],
  },
];

export const mockCharacters: Character[] = [
  {
    id: '99999999-9999-4999-8999-999999999999',
    projectId: mockProject.id,
    name: 'Мира Вейн',
    fullName: 'Мира Элеонора Вейн',
    aliases: ['Свидетельница'],
    role: 'protagonist',
    age: '27',
    birthDate: 'год 1024 от Основания',
    appearance: 'Высокая, тёмные волосы, шрам на левой ладони.',
    personality: 'Наблюдательная, упрямая, не доверяет собственной памяти.',
    motivation: 'Понять, почему она помнит город, который забыл её.',
    goal: 'Найти автора списка и остановить седьмое забвение.',
    conflict: 'Чем больше она вспоминает, тем меньше ей верят.',
    arc: 'От одиночества к ответственности за других.',
    backstory: 'Выросла в Пепельном городе, уехала в шестнадцать, вернулась через одиннадцать лет.',
    voice: 'Сухая, точная, с редкими вспышками иронии.',
    secrets: 'Она уже была в списке шесть лет назад.',
    notes: '',
    status: 'alive',
    tags: ['главная героиня', 'память', 'Пепельный город'],
    color: '#8a5a2b',
    avatarUrl: null,
    customFields: { temp: 'Спокойная под давлением' },
    createdAt: now,
    updatedAt: now,
    version: 5,
  },
  {
    id: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
    projectId: mockProject.id,
    name: 'Кай Рен',
    fullName: 'Кай Рен',
    aliases: ['Смотритель'],
    role: 'deuteragonist',
    age: '31',
    birthDate: 'год 1020 от Основания',
    appearance: 'Седой виск, серые глаза, всегда в перчатках.',
    personality: 'Сдержанный, обязательный, боится привязанности.',
    motivation: 'Сберечь город любой ценой, даже если для этого придётся лгать.',
    goal: 'Не допустить, чтобы Мира узнала правду о седьмом списке.',
    conflict: 'Долг смотрителя против чувств к Мире.',
    arc: 'От исполнителя к тому, кто выбирает сам.',
    backstory: 'Последний смотритель архива, унаследовал должность от отца.',
    voice: 'Ровный, короткие фразы, избегает местоимения «я».',
    secrets: 'Его имя тоже было в списке шесть лет назад.',
    notes: '',
    status: 'alive',
    tags: ['смотритель', 'архив', 'союзник'],
    color: '#4a6a7a',
    avatarUrl: null,
    customFields: {},
    createdAt: now,
    updatedAt: now,
    version: 3,
  },
  {
    id: 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
    projectId: mockProject.id,
    name: 'Селина Мор',
    fullName: 'Селина Мор',
    aliases: ['Седьмая'],
    role: 'antagonist',
    age: 'Неизвестен',
    birthDate: 'неизвестно',
    appearance: 'Белое пальто, пепельные волосы, лицо, которое трудно запомнить.',
    personality: 'Терпеливая, обаятельная, не считает людей равными себе.',
    motivation: 'Завершить ритуал и стереть город окончательно.',
    goal: 'Собрать все семь имён.',
    conflict: 'Мира — единственная, кто может её остановить.',
    arc: 'Не меняется; её неизменность и есть трагедия.',
    backstory: 'Появляется в городе каждые семь лет под новым именем.',
    voice: 'Мягкая, вежливая, с паузами, которые пугают.',
    secrets: 'Она не помнит своего первого имени.',
    notes: 'Не раскрывать до третьего акта.',
    status: 'unknown',
    tags: ['антагонист', 'ритуал', 'забвение'],
    color: '#7a4a5a',
    avatarUrl: null,
    customFields: {},
    createdAt: now,
    updatedAt: now,
    version: 2,
  },
];

export const mockRelations: CharacterRelation[] = [
  {
    id: 'dddddddd-dddd-4ddd-8ddd-dddddddddddd',
    projectId: mockProject.id,
    fromCharacterId: '99999999-9999-4999-8999-999999999999',
    toCharacterId: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
    type: 'ally',
    label: 'союзники поневоле',
    strength: 55,
    isMutual: true,
    notes: 'Доверие растёт медленно.',
    createdAt: now,
    updatedAt: now,
  },
  {
    id: 'eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee',
    projectId: mockProject.id,
    fromCharacterId: '99999999-9999-4999-8999-999999999999',
    toCharacterId: 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
    type: 'enemy',
    label: 'охотник и добыча',
    strength: -90,
    isMutual: false,
    notes: '',
    createdAt: now,
    updatedAt: now,
  },
];

export const mockAttachments: Attachment[] = [
  {
    id: 'ffffffff-ffff-4fff-8fff-ffffffffffff',
    assetId: '12121212-1212-4212-8212-121212121212',
    targetType: 'character',
    targetId: '99999999-9999-4999-8999-999999999999',
    role: 'illustration',
    caption: 'Мира на площади',
    sortOrder: 0,
    url: 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=800',
    thumbUrl: 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=240',
    createdAt: now,
  },
];

export const mockAsset: Asset = {
  id: '12121212-1212-4212-8212-121212121212',
  projectId: mockProject.id,
  mime: 'image/jpeg',
  sizeBytes: 482000,
  width: 1200,
  height: 800,
  status: 'ready',
  url: 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=800',
  thumbUrl: 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=240',
  createdAt: now,
};

export const mockExports: ExportJob[] = [
  {
    id: 'cccccccc-cccc-4ccc-8ccc-cccccccccccc',
    projectId: mockProject.id,
    format: 'docx',
    status: 'succeeded',
    progress: 100,
    error: null,
    warnings: [],
    downloadUrl: 'https://example.com/exports/hroniki-pelnoy-luny.docx',
    createdAt: now,
    startedAt: now,
    finishedAt: now,
  },
];
