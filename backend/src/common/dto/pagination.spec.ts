import { paginate, PaginationQueryDto, toSkipTake } from './pagination';

describe('paginação', () => {
  const query = Object.assign(new PaginationQueryDto(), { page: 3, pageSize: 10 });

  it('calcula skip e take', () => {
    expect(toSkipTake(query)).toEqual({ skip: 20, take: 10 });
  });

  it('monta a resposta com total de páginas', () => {
    expect(paginate(['a'], 21, query)).toEqual({
      data: ['a'],
      page: 3,
      pageSize: 10,
      total: 21,
      totalPages: 3,
    });
  });

  it('sempre informa ao menos uma página', () => {
    expect(paginate([], 0, query).totalPages).toBe(1);
  });
});
