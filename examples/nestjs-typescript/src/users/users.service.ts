import { Injectable } from '@nestjs/common';
import { create, deleteUser, getAll, getById, getRandomUser, update, User, UserPartial } from './users.data';

@Injectable()
export class UsersService {
  async getUser(
    id: number,
  ): Promise<User | null> {
    return getById(id);
  }

  async getUsers(): Promise<User[]> {
    return getAll()
  }

  async createUser(data: UserPartial): Promise<User> {
    return create(data);
  }

  async updateUser(id: number, data: UserPartial): Promise<User> {
    return update(id, data)
  }

  async deleteUser(id: number): Promise<null> {
    deleteUser(id);
    return null
  }

  async findRandomUser() {
    return getRandomUser()
  }
}