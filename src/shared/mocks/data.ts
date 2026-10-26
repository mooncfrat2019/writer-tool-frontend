import type { components } from '@/shared/api/schema';
import { authorSheetsFromCharacters } from '@/shared/lib/format';
import { createMockIllustration } from './image';

type User = components['schemas']['User'];
type Project = components['schemas']['Project'];
type Book = components['schemas']['Book'];
type BookNode = components['schemas']['BookNode'];
type Document = components['schemas']['Document'];
type Character = components['schemas']['Character'];
type CharacterRelation = components['schemas']['CharacterRelation'];
type Attachment = components['schemas']['Attachment'];
type Asset = components['schemas']['Asset'];
type ExportJob = components['schemas']['ExportJob'];

export type MockState = {
  projects: Project[];
  books: Book[];
  nodes: BookNode[];
  documents: Document[];
  characters: Character[];
  relations: CharacterRelation[];
  attachments: Attachment[];
  assets: Asset[];
  exports: ExportJob[];
};

type CountFields = { characterCount: number; authorSheets: number };
type BookSeed = Omit<Book, keyof CountFields>;
type DocumentSeed = Omit<Document, keyof CountFields>;
type BookNodeSeed = Omit<BookNode, keyof CountFields | 'children'> & {
  children?: BookNodeSeed[];
};

function approximateCharacterCount(wordCount: number): number {
  return Math.round(wordCount * 6);
}

export function withMockCounts<T extends { wordCount: number }>(
  seed: T,
): T & CountFields {
  const characterCount = approximateCharacterCount(seed.wordCount);
  return {
    ...seed,
    characterCount,
    authorSheets: authorSheetsFromCharacters(characterCount),
  };
}

export function normalizeMockNode(seed: BookNodeSeed): BookNode {
  const { children, ...rest } = seed;
  const node = withMockCounts(rest) as BookNode;
  if (children?.length) {
    node.children = children.map(normalizeMockNode);
  }
  return node;
}

const now = new Date('2026-10-26T09:30:00.000Z').toISOString();
const yesterday = new Date('2026-10-25T17:20:00.000Z').toISOString();
const earlier = new Date('2026-10-20T11:00:00.000Z').toISOString();

export const mockUser: User = {
  id: '11111111-1111-4111-8111-111111111111',
  email: 'author@example.com',
  displayName: 'Анна Автор',
  avatarUrl: null,
  emailVerified: true,
  createdAt: new Date('2025-02-14T10:00:00.000Z').toISOString(),
};

export const mockProject: Project = {
  id: '22222222-2222-4222-8222-222222222222',
  title: 'Хроники Пепельной Луны',
  description:
    'Тёмное фэнтези о городе, который каждые семь лет теряет память, и о девушке, которая помнит всё.',
  genre: 'Тёмное фэнтези',
  language: 'ru',
  role: 'owner',
  membersCount: 2,
  booksCount: 1,
  wordCount: 0,
  coverUrl: null,
  updatedAt: now,
  settings: {},
  createdAt: new Date('2025-11-04T09:00:00.000Z').toISOString(),
  version: 3,
};

const viewerProject: Project = {
  id: '22222222-2222-4222-8222-222222222223',
  title: 'Сад незакрытых дверей',
  description:
    'Магический реализм о семье, которая каждое лето возвращается в дом, где двери открываются в чужие воспоминания.',
  genre: 'Магический реализм',
  language: 'ru',
  role: 'viewer',
  membersCount: 3,
  booksCount: 1,
  wordCount: 0,
  coverUrl: null,
  updatedAt: yesterday,
  settings: {},
  createdAt: new Date('2026-01-19T12:00:00.000Z').toISOString(),
  version: 2,
};

const mockBookSeed: BookSeed = {
  id: '33333333-3333-4333-8333-333333333333',
  projectId: mockProject.id,
  title: 'Книга первая. Пепел',
  subtitle: 'Хроники Пепельной Луны',
  seriesOrder: 1,
  status: 'drafting',
  synopsis:
    'Мира возвращается в город, где её никто не помнит, и находит список имён тех, кто должен исчезнуть.',
  coverUrl: null,
  targetWordCount: 120_000,
  wordCount: 0,
  language: 'ru',
  createdAt: new Date('2025-11-04T09:05:00.000Z').toISOString(),
  updatedAt: now,
  version: 7,
};

export const mockBook: Book = withMockCounts(mockBookSeed);

const viewerBookSeed: BookSeed = {
  id: '33333333-3333-4333-8333-333333333334',
  projectId: viewerProject.id,
  title: 'Тихие комнаты',
  subtitle: 'Сад незакрытых дверей',
  seriesOrder: 1,
  status: 'revising',
  synopsis: 'Лето, которое семья проведёт между воспоминаниями и собственным домом.',
  coverUrl: null,
  targetWordCount: 80_000,
  wordCount: 0,
  language: 'ru',
  createdAt: new Date('2026-01-21T08:00:00.000Z').toISOString(),
  updatedAt: yesterday,
  version: 3,
};

const viewerBook: Book = withMockCounts(viewerBookSeed);

const chapterOneContent = {
  type: 'doc',
  content: [
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
};

const sceneOneContent = {
  type: 'doc',
  content: [
    {
      type: 'paragraph',
      content: [
        {
          type: 'text',
          text: 'Площадь пахла мокрым камнем и старой золой. Ветер перебирал афиши на стене ратуши, и Мира впервые за одиннадцать лет ощутила себя дома.',
        },
      ],
    },
  ],
};

const viewerChapterContent = {
  type: 'doc',
  content: [
    {
      type: 'paragraph',
      content: [
        {
          type: 'text',
          text: 'В июле сад переставал принадлежать времени. Двери в конце дорожки открывались в комнаты, которых в доме никогда не было, и бабушка просила не запоминать то, что мы там увидим.',
        },
      ],
    },
  ],
};

const documentOneSeed: DocumentSeed = {
  id: '88888888-8888-4888-8888-888888888888',
  projectId: mockProject.id,
  kind: 'text',
  title: 'Глава 1. Пробуждение',
  wordCount: 0,
  version: 12,
  snapshotAt: now,
  updatedAt: now,
  canonical: chapterOneContent,
};

const documentOne: Document = withMockCounts(documentOneSeed);

const sceneDocumentSeed: DocumentSeed = {
  id: '88888888-8888-4888-8888-888888888889',
  projectId: mockProject.id,
  kind: 'text',
  title: 'Сцена 1. Площадь',
  wordCount: 0,
  version: 2,
  snapshotAt: now,
  updatedAt: now,
  canonical: sceneOneContent,
};

const sceneDocument: Document = withMockCounts(sceneDocumentSeed);

const viewerDocumentSeed: DocumentSeed = {
  id: '88888888-8888-4888-8888-888888888890',
  projectId: viewerProject.id,
  kind: 'text',
  title: 'Глава 1. Июль',
  wordCount: 0,
  version: 4,
  snapshotAt: yesterday,
  updatedAt: yesterday,
  canonical: viewerChapterContent,
};

const viewerDocument: Document = withMockCounts(viewerDocumentSeed);

const mockNodeSeeds: BookNodeSeed[] = [
  {
    id: '44444444-4444-4444-8444-444444444441',
    bookId: mockBook.id,
    parentId: null,
    type: 'part',
    title: 'Часть I. Город, который забыл',
    synopsis: 'Мира возвращается в Пепельный город и понимает, что её никто не помнит.',
    notes: '',
    status: 'draft',
    sortKey: '000000',
    targetWordCount: 40_000,
    povCharacterId: null,
    documentId: null,
    wordCount: 0,
    createdAt: now,
    updatedAt: now,
    version: 1,
  },
  {
    id: '55555555-5555-4555-8555-555555555551',
    bookId: mockBook.id,
    parentId: '44444444-4444-4444-8444-444444444441',
    type: 'chapter',
    title: 'Глава 1. Пробуждение',
    synopsis: 'Мира приходит на площадь и находит список имён.',
    notes: 'POV Мира. Первое появление списка.',
    status: 'draft',
    sortKey: '000000',
    targetWordCount: 3_500,
    povCharacterId: '99999999-9999-4999-8999-999999999999',
    documentId: documentOne.id,
    wordCount: 0,
    createdAt: now,
    updatedAt: now,
    version: 4,
  },
  {
    id: '66666666-6666-4666-8666-666666666661',
    bookId: mockBook.id,
    parentId: '55555555-5555-4555-8555-555555555551',
    type: 'scene',
    title: 'Сцена 1. Площадь',
    synopsis: 'Мира вспоминает город, которого больше нет.',
    notes: '',
    status: 'draft',
    sortKey: '000000',
    targetWordCount: 1_500,
    povCharacterId: '99999999-9999-4999-8999-999999999999',
    documentId: sceneDocument.id,
    wordCount: 0,
    createdAt: now,
    updatedAt: now,
    version: 2,
  },
  {
    id: '55555555-5555-4555-8555-555555555552',
    bookId: mockBook.id,
    parentId: '44444444-4444-4444-8444-444444444441',
    type: 'chapter',
    title: 'Глава 2. Список',
    synopsis: 'Мира пытается понять, кто оставил список и почему её имя первое.',
    notes: '',
    status: 'outline',
    sortKey: '000001',
    targetWordCount: 4_000,
    povCharacterId: '99999999-9999-4999-8999-999999999999',
    documentId: null,
    wordCount: 0,
    createdAt: now,
    updatedAt: now,
    version: 1,
  },
  {
    id: '44444444-4444-4444-8444-444444444442',
    bookId: mockBook.id,
    parentId: null,
    type: 'part',
    title: 'Часть II. Седьмое имя',
    synopsis: 'Список ведёт Миру в архив, где хранят чужие воспоминания.',
    notes: '',
    status: 'idea',
    sortKey: '000001',
    targetWordCount: 45_000,
    povCharacterId: null,
    documentId: null,
    wordCount: 0,
    createdAt: now,
    updatedAt: now,
    version: 1,
  },
  {
    id: '55555555-5555-4555-8555-555555555553',
    bookId: mockBook.id,
    parentId: '44444444-4444-4444-8444-444444444442',
    type: 'chapter',
    title: 'Глава 3. Стена имён',
    synopsis: 'Кай показывает Мире архив, но скрывает одну из дверей.',
    notes: '',
    status: 'idea',
    sortKey: '000000',
    targetWordCount: 4_200,
    povCharacterId: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
    documentId: null,
    wordCount: 0,
    createdAt: now,
    updatedAt: now,
    version: 1,
  },
  {
    id: '44444444-4444-4444-8444-444444444443',
    bookId: viewerBook.id,
    parentId: null,
    type: 'part',
    title: 'Часть I. Июль',
    synopsis: 'Семья открывает дом, который помнит больше, чем они.',
    notes: '',
    status: 'revised',
    sortKey: '000000',
    targetWordCount: 30_000,
    povCharacterId: null,
    documentId: null,
    wordCount: 0,
    createdAt: yesterday,
    updatedAt: yesterday,
    version: 1,
  },
  {
    id: '55555555-5555-4555-8555-555555555554',
    bookId: viewerBook.id,
    parentId: '44444444-4444-4444-8444-444444444443',
    type: 'chapter',
    title: 'Глава 1. Июль',
    synopsis: 'Первая дверь открывается сама.',
    notes: 'Только просмотр.',
    status: 'revised',
    sortKey: '000000',
    targetWordCount: 3_000,
    povCharacterId: null,
    documentId: viewerDocument.id,
    wordCount: 0,
    createdAt: yesterday,
    updatedAt: yesterday,
    version: 1,
  },
];

export const mockNodes: BookNode[] = mockNodeSeeds.map(normalizeMockNode);

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
    createdAt: earlier,
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
    appearance: 'Седой висок, серые глаза, всегда в перчатках.',
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
    createdAt: earlier,
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
    createdAt: earlier,
    updatedAt: now,
    version: 2,
  },
  {
    id: 'cccccccc-cccc-4ccc-8ccc-cccccccccccc',
    projectId: viewerProject.id,
    name: 'Вера',
    role: 'supporting',
    age: '34',
    appearance: 'Летнее платье, сандалии, ключ на шнурке.',
    personality: 'Спокойная до тех пор, пока не заходит речь о саде.',
    tags: ['дом', 'лето'],
    status: 'alive',
    color: '#6d6a52',
    avatarUrl: null,
    customFields: {},
    createdAt: earlier,
    updatedAt: yesterday,
    version: 1,
  },
];

export const mockRelations: CharacterRelation[] = [
  {
    id: 'dddddddd-dddd-4ddd-8ddd-ddddddddddd1',
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

export const mockAssets: Asset[] = [
  {
    id: '12121212-1212-4212-8212-121212121212',
    projectId: mockProject.id,
    mime: 'image/svg+xml',
    sizeBytes: 48_000,
    width: 960,
    height: 640,
    status: 'ready',
    url: createMockIllustration('Мира на площади'),
    thumbUrl: createMockIllustration('Мира на площади'),
    createdAt: now,
  },
];

export const mockAttachments: Attachment[] = [
  {
    id: 'ffffffff-ffff-4fff-8fff-ffffffffffff',
    assetId: mockAssets[0].id,
    targetType: 'character',
    targetId: '99999999-9999-4999-8999-999999999999',
    role: 'illustration',
    caption: 'Мира на площади',
    sortOrder: 0,
    url: mockAssets[0].url,
    thumbUrl: mockAssets[0].thumbUrl,
    createdAt: now,
  },
];

export const mockExports: ExportJob[] = [
  {
    id: 'aaaaaaaa-1111-4aaa-8aaa-aaaaaaaaaaaa',
    projectId: mockProject.id,
    format: 'docx',
    status: 'succeeded',
    progress: 100,
    error: null,
    warnings: [],
    downloadUrl: 'https://example.com/exports/pepelnaya-luna.docx',
    createdAt: earlier,
    startedAt: earlier,
    finishedAt: earlier,
  },
  {
    id: 'aaaaaaaa-2222-4aaa-8aaa-aaaaaaaaaaaa',
    projectId: mockProject.id,
    format: 'fb2',
    status: 'failed',
    progress: 48,
    error: 'Не удалось собрать сноски главы 2.',
    warnings: ['Обложка не найдена, используется пустая страница.'],
    downloadUrl: null,
    createdAt: yesterday,
    startedAt: yesterday,
    finishedAt: yesterday,
  },
];

export function createInitialMockState(): MockState {
  return {
    projects: [structuredClone(mockProject), structuredClone(viewerProject)],
    books: [structuredClone(mockBook), structuredClone(viewerBook)],
    nodes: structuredClone(mockNodes),
    documents: [
      structuredClone(documentOne),
      structuredClone(sceneDocument),
      structuredClone(viewerDocument),
    ],
    characters: structuredClone(mockCharacters),
    relations: structuredClone(mockRelations),
    attachments: structuredClone(mockAttachments),
    assets: structuredClone(mockAssets),
    exports: structuredClone(mockExports),
  };
}
