import { Body, Controller, Delete, Get, Param, Post, Put } from '@nestjs/common';
import { UsersService } from './users.service';
import { User, UserPartial } from './users.data';

@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  // @nanoapi path:/api/v1/users/ method:POST
  @Post()
  async createUser(@Body() userData: UserPartial): Promise<User> {
    return this.usersService.createUser(userData);
  }

  // @nanoapi path:/api/v1/users/ method:GET
  @Get()
  async findAllUsers(): Promise<User[]> {
    return this.usersService.getUsers();
  }

  // @nanoapi path:/api/v1/users/random method:GET
  @Get('/random')
  async findRandomUser(): Promise<User | { id: number, name: string }> {
    return this.usersService.findRandomUser();
  }

  // @nanoapi path:/api/v1/users/:id/ method:GET
  @Get(':id')
  async findUserById(@Param('id') id: number): Promise<User | null> {
    return this.usersService.getUser(id);
  }

  // @nanoapi path:/api/v1/users/:id/ method:PUT
  @Put(':id')
  async updateUser(
    @Param('id') id: number,
    @Body() userData: UserPartial,
  ): Promise<User> {
    return this.usersService.updateUser(id, userData);
  }

  // @nanoapi path:/api/v1/users/:id/ method:DELETE
  @Delete(':id')
  async deleteUser(@Param('id') id: number): Promise<null> {
    return this.usersService.deleteUser(id);
  }
}


