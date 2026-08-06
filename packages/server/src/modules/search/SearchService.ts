import { Injectable } from '@server/najm';
import { SearchRepository } from './SearchRepository';

@Injectable()
export class SearchService {
  constructor(private searchRepository: SearchRepository) {}

  async searchGlobal(query: string, limit?: number) {
    return this.searchRepository.searchGlobal(query, limit);
  }

  async searchStudents(query: string, limit?: number) {
    return this.searchRepository.searchStudents(query, limit);
  }

  async searchTeachers(query: string, limit?: number) {
    return this.searchRepository.searchTeachers(query, limit);
  }

  async searchParents(query: string, limit?: number) {
    return this.searchRepository.searchParents(query, limit);
  }
}
