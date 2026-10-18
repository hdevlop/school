import { afterEach, describe, expect, it, spyOn } from 'bun:test';
import { api } from '../../src/services/http';
import { getUsersApi } from '../../src/services/userApi';

const firstPage = Array.from({ length: 100 }, (_, index) => ({ id: `user-${index}` }));
let get: ReturnType<typeof spyOn> | undefined;
afterEach(() => { get?.mockRestore(); });

describe('complete user list', () => {
  it('includes accounts beyond the first page and preserves the CRUD response envelope', async () => {
    get = spyOn(api, 'get')
      .mockResolvedValueOnce({ data: { data: firstPage, status: 200, message: 'Users retrieved' } })
      .mockResolvedValueOnce({ data: { data: [{ id: 'user-100' }], status: 200, message: 'Users retrieved' } });
    const result = await getUsersApi();
    expect(result.data).toHaveLength(101);
    expect(result.data[100]).toEqual({ id: 'user-100' });
    expect(result.status).toBe(200);
    expect(get).toHaveBeenNthCalledWith(2, '/users', { params: { limit: 100, offset: 100 } });
  });

  it('rejects a failed later page instead of presenting a partial list as complete', async () => {
    get = spyOn(api, 'get')
      .mockResolvedValueOnce({ data: { data: firstPage } })
      .mockRejectedValueOnce(new Error('Next page unavailable'));
    await expect(getUsersApi()).rejects.toThrow('Next page unavailable');
  });
});
