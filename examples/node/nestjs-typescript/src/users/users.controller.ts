import { Body, Controller, Delete, Get, Param, Post, Put } from '@nestjs/common';
import { UsersService } from './users.service';
import { User, UserPartial } from './users.data';

@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  // @nanoapi method:POST path:/api/v1/users/ group:users
  @Post()
  async createUser(@Body() userData: UserPartial): Promise<User> {
    return this.usersService.createUser(userData);
  }

  // @nanoapi method:GET path:/api/v1/users/ group:users
  @Get()
  async findAllUsers(): Promise<User[]> {
    return this.usersService.getUsers();
  }

  // @nanoapi method:GET path:/api/v1/users/random group:users
  @Get('/random')
  async findRandomUser(): Promise<User | { id: number, name: string }> {
    return this.usersService.findRandomUser();
  }

  // @nanoapi method:GET path:/api/v1/users/:id/ group:users
  @Get(':id')
  async findUserById(@Param('id') id: number): Promise<User | null> {
    return this.usersService.getUser(id);
  }

  // @nanoapi method:PUT path:/api/v1/users/:id/ group:users
  @Put(':id')
  async updateUser(
    @Param('id') id: number,
    @Body() userData: UserPartial,
  ): Promise<User> {
    return this.usersService.updateUser(id, userData);
  }

  // @nanoapi method:DELETE path:/api/v1/users/:id/ group:users
  @Delete(':id')
  async deleteUser(@Param('id') id: number): Promise<null> {
    return this.usersService.deleteUser(id);
  }
}


