export default function getAuditData() {
  return [
    {
      path: '/home/joeldemort/dev/shipwriter/backend/src/app.controller.spec.ts',
      sourceCode: "import { Test, TestingModule } from '@nestjs/testing';\n" +
        "import { AppController } from './app.controller';\n" +
        "import { AppService } from './app.service';\n" +
        '\n' +
        "describe('AppController', () => {\n" +
        '  let appController: AppController;\n' +
        '\n' +
        '  beforeEach(async () => {\n' +
        '    const app: TestingModule = await Test.createTestingModule({\n' +
        '      controllers: [AppController],\n' +
        '      providers: [AppService],\n' +
        '    }).compile();\n' +
        '\n' +
        '    appController = app.get<AppController>(AppController);\n' +
        '  });\n' +
        '\n' +
        "  describe('root', () => {\n" +
        `    it('should return "Hello World!"', () => {\n` +
        "      expect(appController.getHello()).toBe('Hello World!');\n" +
        '    });\n' +
        '  });\n' +
        '});\n',
      importSources: [
        '/home/joeldemort/dev/shipwriter/backend/src/app.controller.ts',
        '/home/joeldemort/dev/shipwriter/backend/src/app.service.ts'
      ],
      analysis: {
        tooManyChar: [Object],
        tooManyLines: [Object],
        tooManyDependencies: [Object],
        isUnused: false,
        circularDependencySources: []
      },
      isUnused: true,
      circularDependencySources: []
    },
    {
      path: '/home/joeldemort/dev/shipwriter/backend/src/app.controller.ts',
      sourceCode: "import { Controller, Get, Res, HttpStatus } from '@nestjs/common';\n" +
        "import { Response } from 'express';\n" +
        "import { AppService } from './app.service';\n" +
        '\n' +
        '@Controller()\n' +
        'export class AppController {\n' +
        '  constructor(private readonly appService: AppService) {}\n' +
        '\n' +
        '  // @nanoapi method:GET path:/\n' +
        '  @Get()\n' +
        '  getHello(): string {\n' +
        '    return this.appService.getHello();\n' +
        '  }\n' +
        '\n' +
        '  // @nanoapi method:GET path:/liveness\n' +
        "  @Get('/liveness')\n" +
        '  getLiveness(): string {\n' +
        "    return 'OK';\n" +
        '  }\n' +
        '\n' +
        '  // @nanoapi method:GET path:/readiness\n' +
        "  @Get('/readiness')\n" +
        '  async getReadiness(@Res() res: Response): Promise<Response> {\n' +
        '    // const isDbConnected = await this.prisma.checkDatabaseConnection();\n' +
        '    // if (isDbConnected) {\n' +
        "    //   return res.status(HttpStatus.OK).json({ status: 'ok', database: 'up' });\n" +
        '    // } else {\n' +
        "    //   return res.status(HttpStatus.SERVICE_UNAVAILABLE).json({ status: 'error', database: 'down' });\n" +
        '    // }\n' +
        "    return res.status(HttpStatus.OK).json({ status: 'ok' });\n" +
        '  }\n' +
        '}\n',
      importSources: [ '/home/joeldemort/dev/shipwriter/backend/src/app.service.ts' ],
      analysis: {
        tooManyChar: [Object],
        tooManyLines: [Object],
        tooManyDependencies: [Object],
        isUnused: false,
        circularDependencySources: []
      },
      isUnused: false,
      circularDependencySources: []
    },
    {
      path: '/home/joeldemort/dev/shipwriter/backend/src/app.module.ts',
      sourceCode: "import { Module, NestModule, MiddlewareConsumer } from '@nestjs/common';\n" +
        "import { MongooseModule } from '@nestjs/mongoose';\n" +
        '\n' +
        "import { AuthMiddleware } from './auth/auth.middleware';\n" +
        '\n' +
        "import { AppController } from './app.controller';\n" +
        "import { AppService } from './app.service';\n" +
        "import { AuthModule } from './auth/auth.module';\n" +
        "import { UsersModule } from './users/users.module';\n" +
        "import { WritingModule } from './writing/writing.module';\n" +
        "import { CharactersModule } from './characters/characters.module';\n" +
        "import { BetaModule } from './beta/beta.module';\n" +
        '\n' +
        '@Module({\n' +
        '  imports: [\n' +
        '    MongooseModule.forRoot(\n' +
        '      // config.dbUrl\n' +
        "      'mongodb+srv://nanoapiorg:J5jEq9IuBnTaBXj8@shipwriter-cluster.tykgfmz.mongodb.net/shipwriter?retryWrites=true&w=majority&appName=shipwriter-cluster',\n" +
        '    ),\n' +
        '    AuthModule,\n' +
        '    UsersModule,\n' +
        '    WritingModule,\n' +
        '    CharactersModule,\n' +
        '    BetaModule,\n' +
        '  ],\n' +
        '  controllers: [AppController],\n' +
        '  providers: [AppService],\n' +
        '})\n' +
        'export class AppModule implements NestModule {\n' +
        '  configure(consumer: MiddlewareConsumer) {\n' +
        '    consumer\n' +
        '      .apply(AuthMiddleware)\n' +
        "      // .exclude('auth/(.*)')\n" +
        "      .forRoutes('writing*', 'users*', 'characters*', 'beta-reads*');\n" +
        '  }\n' +
        '}\n',
      importSources: [
        '/home/joeldemort/dev/shipwriter/backend/src/auth/auth.middleware.ts',
        '/home/joeldemort/dev/shipwriter/backend/src/app.controller.ts',
        '/home/joeldemort/dev/shipwriter/backend/src/app.service.ts',
        '/home/joeldemort/dev/shipwriter/backend/src/auth/auth.module.ts',
        '/home/joeldemort/dev/shipwriter/backend/src/users/users.module.ts',
        '/home/joeldemort/dev/shipwriter/backend/src/writing/writing.module.ts',
        '/home/joeldemort/dev/shipwriter/backend/src/characters/characters.module.ts',
        '/home/joeldemort/dev/shipwriter/backend/src/beta/beta.module.ts'
      ],
      analysis: {
        tooManyChar: [Object],
        tooManyLines: [Object],
        tooManyDependencies: [Object],
        isUnused: false,
        circularDependencySources: []
      },
      isUnused: false,
      circularDependencySources: []
    },
    {
      path: '/home/joeldemort/dev/shipwriter/backend/src/app.service.ts',
      sourceCode: "import { Injectable } from '@nestjs/common';\n" +
        '\n' +
        '@Injectable()\n' +
        'export class AppService {\n' +
        '  getHello(): string {\n' +
        "    return 'Hello World!';\n" +
        '  }\n' +
        '}\n',
      importSources: [],
      analysis: {
        tooManyChar: [Object],
        tooManyLines: [Object],
        tooManyDependencies: [Object],
        isUnused: false,
        circularDependencySources: []
      },
      isUnused: false,
      circularDependencySources: []
    },
    {
      path: '/home/joeldemort/dev/shipwriter/backend/src/auth/auth.controller.spec.ts',
      sourceCode: "import { Test, TestingModule } from '@nestjs/testing';\n" +
        "import { AuthController } from './auth.controller';\n" +
        '\n' +
        "describe('AuthController', () => {\n" +
        '  let controller: AuthController;\n' +
        '\n' +
        '  beforeEach(async () => {\n' +
        '    const module: TestingModule = await Test.createTestingModule({\n' +
        '      controllers: [AuthController],\n' +
        '    }).compile();\n' +
        '\n' +
        '    controller = module.get<AuthController>(AuthController);\n' +
        '  });\n' +
        '\n' +
        "  it('should be defined', () => {\n" +
        '    expect(controller).toBeDefined();\n' +
        '  });\n' +
        '});\n',
      importSources: [
        '/home/joeldemort/dev/shipwriter/backend/src/auth/auth.controller.ts'
      ],
      analysis: {
        tooManyChar: [Object],
        tooManyLines: [Object],
        tooManyDependencies: [Object],
        isUnused: false,
        circularDependencySources: []
      },
      isUnused: true,
      circularDependencySources: []
    },
    {
      path: '/home/joeldemort/dev/shipwriter/backend/src/auth/auth.controller.ts',
      sourceCode: "import { Body, Controller, Logger, Post, Res } from '@nestjs/common';\n" +
        "import AuthService from './auth.service';\n" +
        "import { LoginInfo, RegisterInfo } from './auth.types';\n" +
        '\n' +
        "import UserService from '../users/users.service';\n" +
        '\n' +
        '// POST /auth\n' +
        '// The register endpoint is stored with the user endpoints\n' +
        "@Controller('auth')\n" +
        'export class AuthController {\n' +
        '  constructor(\n' +
        '    private readonly authService: AuthService,\n' +
        '    private readonly userService: UserService,\n' +
        '  ) {}\n' +
        '\n' +
        '  // @nanoapi method:POST path:/api/v1/auth group:auth\n' +
        '  @Post()\n' +
        '  async login(@Body() login: LoginInfo, @Res() res): Promise<void> {\n' +
        '    let token;\n' +
        '    try {\n' +
        '      token = await this.authService.comparePassword(login);\n' +
        '    } catch (e) {\n' +
        '      Logger.error(e);\n' +
        '      res.status(400).send(e.message);\n' +
        '    }\n' +
        '\n' +
        '    res.json({ token });\n' +
        '  }\n' +
        '\n' +
        '  // @nanoapi method:POST path:/api/v1/auth/register group:auth\n' +
        "  @Post('register')\n" +
        '  async register(@Body() login: RegisterInfo, @Res() res): Promise<void> {\n' +
        '    let token;\n' +
        '    try {\n' +
        '      const user = await this.userService.registerNewUser(login);\n' +
        '\n' +
        '      token = this.authService.generateJWT(user);\n' +
        '    } catch (e) {\n' +
        '      res.status(400).send(e.message);\n' +
        '    }\n' +
        '\n' +
        '    res.json({ token });\n' +
        '  }\n' +
        '}\n',
      importSources: [
        '/home/joeldemort/dev/shipwriter/backend/src/auth/auth.service.ts',
        '/home/joeldemort/dev/shipwriter/backend/src/auth/auth.types.ts',
        '/home/joeldemort/dev/shipwriter/backend/src/users/users.service.ts'
      ],
      analysis: {
        tooManyChar: [Object],
        tooManyLines: [Object],
        tooManyDependencies: [Object],
        isUnused: false,
        circularDependencySources: []
      },
      isUnused: false,
      circularDependencySources: []
    },
    {
      path: '/home/joeldemort/dev/shipwriter/backend/src/auth/auth.middleware.ts',
      sourceCode: "import { Injectable, NestMiddleware, Logger } from '@nestjs/common';\n" +
        "import { Request, Response, NextFunction } from 'express';\n" +
        '\n' +
        "import { Jwt } from './jwt';\n" +
        '\n' +
        '@Injectable()\n' +
        'export class AuthMiddleware implements NestMiddleware {\n' +
        '  async use(req: Request, res: Response, next: NextFunction) {\n' +
        '    // Check the headers for a valid JWT token, and extract the user ID from it\n' +
        '    const jwt = new Jwt();\n' +
        '    let decoded;\n' +
        '    try {\n' +
        "      const token = req.headers.authorization.split(' ')[1];\n" +
        '      decoded = await jwt.verify(token);\n' +
        '    } catch (e) {\n' +
        "      res.status(401).send('Unauthorized');\n" +
        '    }\n' +
        '\n' +
        '    if (!decoded) {\n' +
        "      res.status(401).send('Unauthorized');\n" +
        '    }\n' +
        '\n' +
        '    // Attach the user ID to the request\n' +
        "    req.headers['x-user-id'] = decoded.sub;\n" +
        "    Logger.log(`User ID: ${req.headers['x-user-id']}`);\n" +
        '\n' +
        '    next();\n' +
        '  }\n' +
        '}\n',
      importSources: [ '/home/joeldemort/dev/shipwriter/backend/src/auth/jwt.ts' ],
      analysis: {
        tooManyChar: [Object],
        tooManyLines: [Object],
        tooManyDependencies: [Object],
        isUnused: false,
        circularDependencySources: []
      },
      isUnused: false,
      circularDependencySources: []
    },
    {
      path: '/home/joeldemort/dev/shipwriter/backend/src/auth/auth.module.ts',
      sourceCode: "import { Module } from '@nestjs/common';\n" +
        "import { AuthController } from './auth.controller';\n" +
        "import AuthService from './auth.service';\n" +
        "import { UsersModule } from 'src/users/users.module';\n" +
        '\n' +
        '// @nanoapi path:/api/v1/auth\n' +
        '@Module({\n' +
        '  imports: [UsersModule],\n' +
        '  controllers: [AuthController],\n' +
        '  providers: [AuthService],\n' +
        '})\n' +
        'export class AuthModule {}\n',
      importSources: [
        '/home/joeldemort/dev/shipwriter/backend/src/auth/auth.controller.ts',
        '/home/joeldemort/dev/shipwriter/backend/src/auth/auth.service.ts'
      ],
      analysis: {
        tooManyChar: [Object],
        tooManyLines: [Object],
        tooManyDependencies: [Object],
        isUnused: false,
        circularDependencySources: []
      },
      isUnused: false,
      circularDependencySources: []
    },
    {
      path: '/home/joeldemort/dev/shipwriter/backend/src/auth/auth.service.ts',
      sourceCode: "import { Injectable } from '@nestjs/common';\n" +
        '\n' +
        "import * as bcrypt from 'bcrypt';\n" +
        "import * as jwt from 'jsonwebtoken';\n" +
        '\n' +
        "import { LoginInfo } from './auth.types';\n" +
        "import UsersService from '../users/users.service';\n" +
        '\n' +
        "import config from '../config';\n" +
        '\n' +
        '@Injectable()\n' +
        'export default class AuthService {\n' +
        '  constructor(private readonly usersService: UsersService) {}\n' +
        '\n' +
        '  generateJWT(user: any): string {\n' +
        '    const payload = {};\n' +
        '    const key = config.privateKey;\n' +
        '    const options: jwt.SignOptions = {\n' +
        '      expiresIn: 28800, // 8 hours\n' +
        '      subject: user.id.toString(),\n' +
        '    };\n' +
        '\n' +
        '    const token = jwt.sign(payload, key, options);\n' +
        '    return token;\n' +
        '  }\n' +
        '\n' +
        '  async comparePassword(login: LoginInfo): Promise<string> {\n' +
        '    // Input could be a user name or email. Check for the @ sign.\n' +
        '    let user;\n' +
        "    if (login.emailOrUsername.includes('@')) {\n" +
        '      user = await this.usersService.getUserByEmail(login.emailOrUsername);\n' +
        '    } else {\n' +
        '      user = await this.usersService.getUserByUsername(login.emailOrUsername);\n' +
        '    }\n' +
        '\n' +
        '    if (!user) {\n' +
        "      throw new Error('Incorrect email or username');\n" +
        '    }\n' +
        '\n' +
        '    const validPassword = await bcrypt.compare(login.password, user.password);\n' +
        '    if (!validPassword) {\n' +
        "      throw new Error('Incorrect password');\n" +
        '    }\n' +
        '\n' +
        '    return this.generateJWT(user);\n' +
        '  }\n' +
        '}\n',
      importSources: [
        '/home/joeldemort/dev/shipwriter/backend/src/auth/auth.types.ts',
        '/home/joeldemort/dev/shipwriter/backend/src/users/users.service.ts',
        '/home/joeldemort/dev/shipwriter/backend/src/config.ts'
      ],
      analysis: {
        tooManyChar: [Object],
        tooManyLines: [Object],
        tooManyDependencies: [Object],
        isUnused: false,
        circularDependencySources: []
      },
      isUnused: false,
      circularDependencySources: []
    },
    {
      path: '/home/joeldemort/dev/shipwriter/backend/src/auth/auth.types.ts',
      sourceCode: 'export class LoginInfo {\n' +
        '  emailOrUsername: string;\n' +
        '  password: string;\n' +
        '}\n' +
        '\n' +
        'export class RegisterInfo {\n' +
        '  email: string;\n' +
        '  username: string;\n' +
        '  password: string;\n' +
        '  goal?: number;\n' +
        '}\n',
      importSources: [],
      analysis: {
        tooManyChar: [Object],
        tooManyLines: [Object],
        tooManyDependencies: [Object],
        isUnused: false,
        circularDependencySources: []
      },
      isUnused: false,
      circularDependencySources: []
    },
    {
      path: '/home/joeldemort/dev/shipwriter/backend/src/auth/jwt.ts',
      sourceCode: "import * as jwt from 'jsonwebtoken';\n" +
        '\n' +
        "import config from '../config';\n" +
        "import { Logger } from '@nestjs/common';\n" +
        '\n' +
        'export class Jwt {\n' +
        '  private key: string;\n' +
        '\n' +
        '  // Key should come from a key gen service. It should change every few hours.\n' +
        '  constructor() {\n' +
        '    this.key = config.privateKey;\n' +
        '  }\n' +
        '\n' +
        '  // TODO: Map decoded values to user info\n' +
        '  async verify(token: string) {\n' +
        '    let decoded;\n' +
        '    try {\n' +
        '      decoded = jwt.verify(token, this.key, {\n' +
        '        clockTolerance: 3,\n' +
        '        ignoreExpiration: false,\n' +
        '      });\n' +
        '    } catch (e) {\n' +
        '      Logger.debug(e.message);\n' +
        "      throw new Error('Could not decode or verify token.');\n" +
        '    }\n' +
        '    return decoded;\n' +
        '  }\n' +
        '}\n',
      importSources: [ '/home/joeldemort/dev/shipwriter/backend/src/config.ts' ],
      analysis: {
        tooManyChar: [Object],
        tooManyLines: [Object],
        tooManyDependencies: [Object],
        isUnused: false,
        circularDependencySources: []
      },
      isUnused: false,
      circularDependencySources: []
    },
    {
      path: '/home/joeldemort/dev/shipwriter/backend/src/beta/beta.controller.spec.ts',
      sourceCode: "import { Test, TestingModule } from '@nestjs/testing';\n" +
        "import { BetaController } from './beta.controller';\n" +
        '\n' +
        "describe('BetaController', () => {\n" +
        '  let controller: BetaController;\n' +
        '\n' +
        '  beforeEach(async () => {\n' +
        '    const module: TestingModule = await Test.createTestingModule({\n' +
        '      controllers: [BetaController],\n' +
        '    }).compile();\n' +
        '\n' +
        '    controller = module.get<BetaController>(BetaController);\n' +
        '  });\n' +
        '\n' +
        "  it('should be defined', () => {\n" +
        '    expect(controller).toBeDefined();\n' +
        '  });\n' +
        '});\n',
      importSources: [
        '/home/joeldemort/dev/shipwriter/backend/src/beta/beta.controller.ts'
      ],
      analysis: {
        tooManyChar: [Object],
        tooManyLines: [Object],
        tooManyDependencies: [Object],
        isUnused: false,
        circularDependencySources: []
      },
      isUnused: true,
      circularDependencySources: []
    },
    {
      path: '/home/joeldemort/dev/shipwriter/backend/src/beta/beta.controller.ts',
      sourceCode: "import { Controller, Get, Post, Req, Res, Logger } from '@nestjs/common';\n" +
        '\n' +
        "import { BetaService } from './beta.service';\n" +
        '\n' +
        "@Controller('beta-reads')\n" +
        'export class BetaController {\n' +
        '  constructor(private readonly betaService: BetaService) {}\n' +
        '\n' +
        '  // @nanoapi method:GET path:/api/v1/beta-reads\n' +
        '  @Get()\n' +
        '  async getBetaReads(@Req() req, @Res() res) {\n' +
        "    const userId = req.headers['x-user-id'];\n" +
        '    try {\n' +
        '      const betaReads = await this.betaService.getBetaReads(userId);\n' +
        '      return res.json(betaReads);\n' +
        '    } catch (e) {\n' +
        '      Logger.error(e);\n' +
        '      return res\n' +
        '        .status(500)\n' +
        "        .send('An error occurred when fetching the beta reads.');\n" +
        '    }\n' +
        '  }\n' +
        '\n' +
        '  // @nanoapi method:GET path:/api/v1/beta-reads/:id\n' +
        "  @Get(':id')\n" +
        '  async getBetaReadById(@Req() req, @Res() res) {\n' +
        "    const userId = req.headers['x-user-id'];\n" +
        '    const betaReadId = req.params.id;\n' +
        '    try {\n' +
        '      const betaRead = await this.betaService.getBetaReadById(\n' +
        '        betaReadId,\n' +
        '        userId,\n' +
        '      );\n' +
        '      return res.json(betaRead);\n' +
        '    } catch (e) {\n' +
        '      Logger.error(e);\n' +
        '      return res\n' +
        '        .status(500)\n' +
        "        .send('An error occurred when fetching the beta read.');\n" +
        '    }\n' +
        '  }\n' +
        '\n' +
        '  // @nanoapi method:POST path:/api/v1/beta-reads/:id\n' +
        '  @Post()\n' +
        '  async createBetaRead(@Req() req, @Res() res) {\n' +
        "    const userId = req.headers['x-user-id'];\n" +
        '    try {\n' +
        '      const betaRead = await this.betaService.createBetaRead(userId, req.body);\n' +
        '      return res.json(betaRead);\n' +
        '    } catch (e) {\n' +
        '      Logger.error(e);\n' +
        '      return res\n' +
        '        .status(500)\n' +
        "        .send('An error occurred when creating the beta read.');\n" +
        '    }\n' +
        '  }\n' +
        '}\n',
      importSources: [
        '/home/joeldemort/dev/shipwriter/backend/src/beta/beta.service.ts'
      ],
      analysis: {
        tooManyChar: [Object],
        tooManyLines: [Object],
        tooManyDependencies: [Object],
        isUnused: false,
        circularDependencySources: []
      },
      isUnused: false,
      circularDependencySources: []
    },
    {
      path: '/home/joeldemort/dev/shipwriter/backend/src/beta/beta.module.ts',
      sourceCode: "import { Module } from '@nestjs/common';\n" +
        "import { MongooseModule } from '@nestjs/mongoose';\n" +
        "import { BetaController } from './beta.controller';\n" +
        "import { BetaService } from './beta.service';\n" +
        "import { BetaSchema } from './beta.schema';\n" +
        '\n' +
        "import { WritingModule } from 'src/writing/writing.module';\n" +
        '\n' +
        '// @nanoapi path:/api/v1/beta-reads\n' +
        '@Module({\n' +
        '  imports: [\n' +
        "    MongooseModule.forFeature([{ name: 'BetaRead', schema: BetaSchema }]),\n" +
        '    WritingModule,\n' +
        '  ],\n' +
        '  controllers: [BetaController],\n' +
        '  providers: [BetaService],\n' +
        '})\n' +
        'export class BetaModule {}\n',
      importSources: [
        '/home/joeldemort/dev/shipwriter/backend/src/beta/beta.controller.ts',
        '/home/joeldemort/dev/shipwriter/backend/src/beta/beta.service.ts',
        '/home/joeldemort/dev/shipwriter/backend/src/beta/beta.schema.ts'
      ],
      analysis: {
        tooManyChar: [Object],
        tooManyLines: [Object],
        tooManyDependencies: [Object],
        isUnused: false,
        circularDependencySources: []
      },
      isUnused: false,
      circularDependencySources: []
    },
    {
      path: '/home/joeldemort/dev/shipwriter/backend/src/beta/beta.schema.ts',
      sourceCode: "import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';\n" +
        "import { HydratedDocument } from 'mongoose';\n" +
        '\n' +
        "import { BetaStatus } from './beta.types';\n" +
        '\n' +
        'export type BetaReadDocument = HydratedDocument<BetaRead>;\n' +
        '\n' +
        '@Schema()\n' +
        'export class BetaRead {\n' +
        '  @Prop()\n' +
        '  title: string;\n' +
        '\n' +
        '  @Prop()\n' +
        '  content: string;\n' +
        '\n' +
        '  @Prop({ default: BetaStatus.PENDING })\n' +
        '  status: BetaStatus;\n' +
        '\n' +
        '  @Prop({ default: 0 })\n' +
        '  totalComments: number;\n' +
        '\n' +
        '  @Prop()\n' +
        '  userId: string;\n' +
        '\n' +
        '  @Prop()\n' +
        '  reviewerId: string;\n' +
        '\n' +
        '  @Prop()\n' +
        '  reviewerUsername: string;\n' +
        '\n' +
        '  @Prop({ default: new Date() })\n' +
        '  createdAt: Date;\n' +
        '\n' +
        '  @Prop({ default: new Date() })\n' +
        '  updatedAt: Date;\n' +
        '}\n' +
        '\n' +
        'export const BetaSchema = SchemaFactory.createForClass(BetaRead);\n',
      importSources: [
        '/home/joeldemort/dev/shipwriter/backend/src/beta/beta.types.ts'
      ],
      analysis: {
        tooManyChar: [Object],
        tooManyLines: [Object],
        tooManyDependencies: [Object],
        isUnused: false,
        circularDependencySources: []
      },
      isUnused: false,
      circularDependencySources: []
    },
    {
      path: '/home/joeldemort/dev/shipwriter/backend/src/beta/beta.service.spec.ts',
      sourceCode: "import { Test, TestingModule } from '@nestjs/testing';\n" +
        "import { BetaService } from './beta.service';\n" +
        '\n' +
        "describe('BetaService', () => {\n" +
        '  let service: BetaService;\n' +
        '\n' +
        '  beforeEach(async () => {\n' +
        '    const module: TestingModule = await Test.createTestingModule({\n' +
        '      providers: [BetaService],\n' +
        '    }).compile();\n' +
        '\n' +
        '    service = module.get<BetaService>(BetaService);\n' +
        '  });\n' +
        '\n' +
        "  it('should be defined', () => {\n" +
        '    expect(service).toBeDefined();\n' +
        '  });\n' +
        '});\n',
      importSources: [
        '/home/joeldemort/dev/shipwriter/backend/src/beta/beta.service.ts'
      ],
      analysis: {
        tooManyChar: [Object],
        tooManyLines: [Object],
        tooManyDependencies: [Object],
        isUnused: false,
        circularDependencySources: []
      },
      isUnused: true,
      circularDependencySources: []
    },
    {
      path: '/home/joeldemort/dev/shipwriter/backend/src/beta/beta.service.ts',
      sourceCode: "import { Injectable } from '@nestjs/common';\n" +
        "import { InjectModel } from '@nestjs/mongoose';\n" +
        "import { Model } from 'mongoose';\n" +
        '\n' +
        "import { BetaRead } from './beta.schema';\n" +
        "import { CreateBetaReadInput } from './beta.types';\n" +
        '\n' +
        "import { WritingService } from 'src/writing/writing.service';\n" +
        '\n' +
        '@Injectable()\n' +
        'export class BetaService {\n' +
        '  constructor(\n' +
        '    @InjectModel(BetaRead.name) private betaReadModel: Model<BetaRead>,\n' +
        '    private writingService: WritingService,\n' +
        '  ) {}\n' +
        '\n' +
        '  async getBetaReadById(id: string, userId: string): Promise<BetaRead> {\n' +
        '    return this.betaReadModel.findOne({ _id: id, userId }).exec();\n' +
        '  }\n' +
        '\n' +
        '  async getBetaReads(\n' +
        '    userId: string,\n' +
        '  ): Promise<{ submitted: BetaRead[]; received: BetaRead[] }> {\n' +
        '    const betaReads = await this.betaReadModel.find({ userId }).exec();\n' +
        '\n' +
        '    // Split the beta reads into submitted and received\n' +
        '    const submitted = betaReads.filter(\n' +
        '      (betaRead) => betaRead.reviewerId === userId,\n' +
        '    );\n' +
        '    const received = betaReads.filter(\n' +
        '      (betaRead) => betaRead.reviewerId !== userId,\n' +
        '    );\n' +
        '\n' +
        '    return { submitted, received };\n' +
        '  }\n' +
        '\n' +
        '  async createBetaRead(\n' +
        '    userId: string,\n' +
        '    data: CreateBetaReadInput,\n' +
        '  ): Promise<BetaRead> {\n' +
        '    const writing = await this.writingService.getById(data.writingId, userId);\n' +
        '\n' +
        '    if (!writing) {\n' +
        "      throw new Error('Writing not found');\n" +
        '    }\n' +
        '\n' +
        '    const newBetaRead = new this.betaReadModel({\n' +
        '      ...data,\n' +
        '      userId,\n' +
        '      title: writing.title,\n' +
        '      content: writing.content,\n' +
        '    });\n' +
        '\n' +
        '    return newBetaRead.save();\n' +
        '  }\n' +
        '}\n',
      importSources: [
        '/home/joeldemort/dev/shipwriter/backend/src/beta/beta.schema.ts',
        '/home/joeldemort/dev/shipwriter/backend/src/beta/beta.types.ts'
      ],
      analysis: {
        tooManyChar: [Object],
        tooManyLines: [Object],
        tooManyDependencies: [Object],
        isUnused: false,
        circularDependencySources: []
      },
      isUnused: false,
      circularDependencySources: []
    },
    {
      path: '/home/joeldemort/dev/shipwriter/backend/src/beta/beta.types.ts',
      sourceCode: 'export enum BetaStatus {\n' +
        "  PENDING = 'pending',\n" +
        "  NOT_STARTED = 'not_started',\n" +
        "  IN_PROGRESS = 'in_progress',\n" +
        "  COMPLETED = 'completed',\n" +
        '}\n' +
        '\n' +
        'export type CreateBetaReadInput = {\n' +
        '  writingId: string;\n' +
        '  reviewerId: string;\n' +
        '  reviewerUsername: string;\n' +
        '};\n',
      importSources: [],
      analysis: {
        tooManyChar: [Object],
        tooManyLines: [Object],
        tooManyDependencies: [Object],
        isUnused: false,
        circularDependencySources: []
      },
      isUnused: false,
      circularDependencySources: []
    },
    {
      path: '/home/joeldemort/dev/shipwriter/backend/src/characters/characters.controller.spec.ts',
      sourceCode: "import { Test, TestingModule } from '@nestjs/testing';\n" +
        "import { CharactersController } from './characters.controller';\n" +
        '\n' +
        "describe('CharactersController', () => {\n" +
        '  let controller: CharactersController;\n' +
        '\n' +
        '  beforeEach(async () => {\n' +
        '    const module: TestingModule = await Test.createTestingModule({\n' +
        '      controllers: [CharactersController],\n' +
        '    }).compile();\n' +
        '\n' +
        '    controller = module.get<CharactersController>(CharactersController);\n' +
        '  });\n' +
        '\n' +
        "  it('should be defined', () => {\n" +
        '    expect(controller).toBeDefined();\n' +
        '  });\n' +
        '});\n',
      importSources: [
        '/home/joeldemort/dev/shipwriter/backend/src/characters/characters.controller.ts'
      ],
      analysis: {
        tooManyChar: [Object],
        tooManyLines: [Object],
        tooManyDependencies: [Object],
        isUnused: false,
        circularDependencySources: []
      },
      isUnused: true,
      circularDependencySources: []
    },
    {
      path: '/home/joeldemort/dev/shipwriter/backend/src/characters/characters.controller.ts',
      sourceCode: 'import {\n' +
        '  Controller,\n' +
        '  Get,\n' +
        '  Put,\n' +
        '  Post,\n' +
        '  Delete,\n' +
        '  Param,\n' +
        '  Req,\n' +
        '  Res,\n' +
        '  Body,\n' +
        '  UseInterceptors,\n' +
        '  UploadedFile,\n' +
        '  Query,\n' +
        '  Logger,\n' +
        "} from '@nestjs/common';\n" +
        '\n' +
        "import { CharactersService } from './characters.service';\n" +
        "import { CharacterInput } from './characters.types';\n" +
        "import { FileInterceptor } from '@nestjs/platform-express';\n" +
        '\n' +
        "@Controller('characters')\n" +
        'export class CharactersController {\n' +
        '  constructor(private readonly charactersService: CharactersService) {}\n' +
        '\n' +
        '  // @nanoapi method:GET path:/api/v1/characters/tags\n' +
        "  @Get('tags')\n" +
        "  async getTags(@Req() req, @Res() res, @Query('writingId') writingId: string) {\n" +
        "    const userId = req.headers['x-user-id'];\n" +
        '    let tags;\n' +
        '    try {\n' +
        '      tags = await this.charactersService.getCharacterTags(userId, writingId);\n' +
        '    } catch (e) {\n' +
        '      Logger.error(e);\n' +
        "      return res.status(500).send('An error occurred when fetching the tags.');\n" +
        '    }\n' +
        '\n' +
        '    return res.json(tags);\n' +
        '  }\n' +
        '\n' +
        '  // @nanoapi method:GET path:/api/v1/characters\n' +
        '  @Get()\n' +
        '  async getCharacters(\n' +
        '    @Req() req,\n' +
        '    @Res() res,\n' +
        "    @Query('writingId') writingId: string,\n" +
        '  ) {\n' +
        "    const userId = req.headers['x-user-id'];\n" +
        '    let characters;\n' +
        '    try {\n' +
        '      characters = await this.charactersService.getAll(userId, writingId);\n' +
        '    } catch (e) {\n' +
        '      return res\n' +
        '        .status(500)\n' +
        "        .send('An error occurred when fetching the characters.');\n" +
        '    }\n' +
        '\n' +
        '    return res.json(characters);\n' +
        '  }\n' +
        '\n' +
        '  // @nanoapi method:GET path:/api/v1/characters/:id\n' +
        "  @Get(':id')\n" +
        "  async getCharacter(@Req() req, @Res() res, @Param('id') id: string) {\n" +
        "    const userId = req.headers['x-user-id'];\n" +
        '    let character;\n' +
        '    try {\n' +
        '      character = await this.charactersService.getById(id, userId);\n' +
        '    } catch (e) {\n' +
        '      return res\n' +
        '        .status(500)\n' +
        "        .send('An error occurred when fetching the character.');\n" +
        '    }\n' +
        '\n' +
        '    return res.json(character);\n' +
        '  }\n' +
        '\n' +
        '  // @nanoapi method:POST path:/api/v1/characters\n' +
        '  @Post()\n' +
        '  async createCharacter(\n' +
        '    @Req() req,\n' +
        '    @Res() res,\n' +
        '    @Body() characterData: CharacterInput,\n' +
        '  ) {\n' +
        "    const userId = req.headers['x-user-id'];\n" +
        '    let newCharacter;\n' +
        '    try {\n' +
        '      newCharacter = await this.charactersService.create(userId, characterData);\n' +
        '    } catch (e) {\n' +
        '      return res\n' +
        '        .status(500)\n' +
        "        .send('An error occurred when creating the character.');\n" +
        '    }\n' +
        '\n' +
        '    return res.json(newCharacter);\n' +
        '  }\n' +
        '\n' +
        '  // @nanoapi method:PUT path:/api/v1/characters/:id\n' +
        "  @Put(':id')\n" +
        '  async updateCharacter(\n' +
        '    @Req() req,\n' +
        '    @Res() res,\n' +
        "    @Param('id') id: string,\n" +
        '    @Body() characterData: CharacterInput,\n' +
        '  ) {\n' +
        "    const userId = req.headers['x-user-id'];\n" +
        '    let updatedCharacter;\n' +
        '    try {\n' +
        '      updatedCharacter = await this.charactersService.updateById(\n' +
        '        id,\n' +
        '        userId,\n' +
        '        characterData,\n' +
        '      );\n' +
        '    } catch (e) {\n' +
        '      return res\n' +
        '        .status(500)\n' +
        "        .send('An error occurred when updating the character.');\n" +
        '    }\n' +
        '\n' +
        '    return res.json(updatedCharacter);\n' +
        '  }\n' +
        '\n' +
        '  // @nanoapi method:DELETE path:/api/v1/characters/:id\n' +
        "  @Delete(':id')\n" +
        "  async deleteCharacter(@Req() req, @Res() res, @Param('id') id: string) {\n" +
        "    const userId = req.headers['x-user-id'];\n" +
        '    let deletedCharacter;\n' +
        '    try {\n' +
        '      deletedCharacter = await this.charactersService.deleteById(id, userId);\n' +
        '    } catch (e) {\n' +
        '      return res\n' +
        '        .status(500)\n' +
        "        .send('An error occurred when deleting the character.');\n" +
        '    }\n' +
        '\n' +
        '    return res.json(deletedCharacter);\n' +
        '  }\n' +
        '\n' +
        '  // @nanoapi method:POST path:/api/v1/characters/:id/image\n' +
        "  @Post(':id/image')\n" +
        "  @UseInterceptors(FileInterceptor('image'))\n" +
        '  async addImage(\n' +
        '    @Req() req,\n' +
        '    @Res() res,\n' +
        "    @Param('id') id: string,\n" +
        '    @UploadedFile() image: Express.Multer.File,\n' +
        '  ) {\n' +
        "    const userId = req.headers['x-user-id'];\n" +
        '    let updatedCharacter;\n' +
        '    try {\n' +
        '      updatedCharacter = await this.charactersService.addImage(\n' +
        '        id,\n' +
        '        userId,\n' +
        '        image,\n' +
        '      );\n' +
        '    } catch (e) {\n' +
        '      Logger.error(e);\n' +
        '      return res\n' +
        '        .status(500)\n' +
        "        .send('An error occurred when adding the image to the character.');\n" +
        '    }\n' +
        '\n' +
        '    return res.json(updatedCharacter);\n' +
        '  }\n' +
        '\n' +
        '  // @nanoapi method:POST path:/api/v1/characters/:id/voice\n' +
        "  @Post(':id/voice')\n" +
        "  @UseInterceptors(FileInterceptor('voice'))\n" +
        '  async addVoice(\n' +
        '    @Req() req,\n' +
        '    @Res() res,\n' +
        "    @Param('id') id: string,\n" +
        '    @UploadedFile() voice: Express.Multer.File,\n' +
        '  ) {\n' +
        "    const userId = req.headers['x-user-id'];\n" +
        '    let updatedCharacter;\n' +
        '    try {\n' +
        '      updatedCharacter = await this.charactersService.addVoice(\n' +
        '        id,\n' +
        '        userId,\n' +
        '        voice,\n' +
        '      );\n' +
        '    } catch (e) {\n' +
        '      Logger.error(e);\n' +
        '\n' +
        '      return res\n' +
        '        .status(500)\n' +
        "        .send('An error occurred when adding the voice to the character.');\n" +
        '    }\n' +
        '\n' +
        '    return res.json(updatedCharacter);\n' +
        '  }\n' +
        '}\n',
      importSources: [
        '/home/joeldemort/dev/shipwriter/backend/src/characters/characters.service.ts',
        '/home/joeldemort/dev/shipwriter/backend/src/characters/characters.types.ts'
      ],
      analysis: {
        tooManyChar: [Object],
        tooManyLines: [Object],
        tooManyDependencies: [Object],
        isUnused: false,
        circularDependencySources: []
      },
      isUnused: false,
      circularDependencySources: []
    },
    {
      path: '/home/joeldemort/dev/shipwriter/backend/src/characters/characters.module.ts',
      sourceCode: "import { Module } from '@nestjs/common';\n" +
        "import { MongooseModule } from '@nestjs/mongoose';\n" +
        "import { CharactersController } from './characters.controller';\n" +
        "import { CharactersService } from './characters.service';\n" +
        "import { Character, CharacterSchema } from './characters.schema';\n" +
        "import { FileService } from 'src/file.service';\n" +
        '\n' +
        '// @nanoapi path:/api/v1/characters\n' +
        '@Module({\n' +
        '  imports: [\n' +
        '    MongooseModule.forFeature([\n' +
        '      { name: Character.name, schema: CharacterSchema },\n' +
        '    ]),\n' +
        '  ],\n' +
        '  controllers: [CharactersController],\n' +
        '  providers: [CharactersService, FileService],\n' +
        '  exports: [CharactersService],\n' +
        '})\n' +
        'export class CharactersModule {}\n',
      importSources: [
        '/home/joeldemort/dev/shipwriter/backend/src/characters/characters.controller.ts',
        '/home/joeldemort/dev/shipwriter/backend/src/characters/characters.service.ts',
        '/home/joeldemort/dev/shipwriter/backend/src/characters/characters.schema.ts'
      ],
      analysis: {
        tooManyChar: [Object],
        tooManyLines: [Object],
        tooManyDependencies: [Object],
        isUnused: false,
        circularDependencySources: []
      },
      isUnused: false,
      circularDependencySources: []
    },
    {
      path: '/home/joeldemort/dev/shipwriter/backend/src/characters/characters.schema.ts',
      sourceCode: "import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';\n" +
        "import { HydratedDocument } from 'mongoose';\n" +
        '\n' +
        '// Vlees (Dutch: meat) is a term used in writing to describe the\n' +
        '// details that make a character feel real. This schema is for\n' +
        '// storing those details. This is a Pro feature\n' +
        '@Schema()\n' +
        'export class CharacterVlees {\n' +
        '  @Prop()\n' +
        '  want: string;\n' +
        '\n' +
        '  @Prop()\n' +
        '  need: string;\n' +
        '\n' +
        '  @Prop()\n' +
        '  drive: string;\n' +
        '\n' +
        '  @Prop({ type: [String] })\n' +
        '  secrets: string[];\n' +
        '\n' +
        '  @Prop()\n' +
        '  flaw: string;\n' +
        '\n' +
        '  @Prop()\n' +
        '  strength: string;\n' +
        '\n' +
        '  // In writing, this is the cost that must be paid to achieve\n' +
        '  // the need or want of the character.\n' +
        '  @Prop()\n' +
        '  cost: string;\n' +
        '}\n' +
        '\n' +
        'export const CharacterVleesSchema =\n' +
        '  SchemaFactory.createForClass(CharacterVlees);\n' +
        '\n' +
        'export type CharacterDocument = HydratedDocument<Character>;\n' +
        '\n' +
        '@Schema()\n' +
        'export class Character {\n' +
        '  @Prop()\n' +
        '  name: string;\n' +
        '\n' +
        "  // { age: 25, height: '6ft', weight: '180lbs', ... }\n" +
        '  // An open-ended subdocument for storing any attributes\n' +
        '  @Prop({ type: Object })\n' +
        '  attributes: object;\n' +
        '\n' +
        '  // The vlees of the character\n' +
        '  @Prop({ type: CharacterVleesSchema })\n' +
        '  vlees: CharacterVlees;\n' +
        '\n' +
        '  // The main text content of the character\n' +
        '  @Prop()\n' +
        '  details: string;\n' +
        '\n' +
        '  // Tags for the character. These are names that will show up\n' +
        "  // in the text of the story as a link to the character's page.\n" +
        '  @Prop()\n' +
        '  tags: string[];\n' +
        '\n' +
        '  @Prop()\n' +
        '  imageUrl: string;\n' +
        '\n' +
        '  // This will be a link to a voice recording of the character.\n' +
        '  // This is helpful for DMs or other creatives to want to\n' +
        "  // get a feel for the character's voice and capture it.\n" +
        '  @Prop()\n' +
        '  voiceUrl: string;\n' +
        '\n' +
        '  // The user who created the character\n' +
        '  @Prop()\n' +
        '  userId: string;\n' +
        '\n' +
        '  // The writing this user belongs to\n' +
        '  @Prop()\n' +
        '  writingId: string;\n' +
        '\n' +
        '  // The date the character was created\n' +
        '  @Prop()\n' +
        '  createdAt: Date;\n' +
        '\n' +
        '  // The date the character was last updated\n' +
        '  @Prop()\n' +
        '  updatedAt: Date;\n' +
        '}\n' +
        '\n' +
        'export const CharacterSchema = SchemaFactory.createForClass(Character);\n',
      importSources: [],
      analysis: {
        tooManyChar: [Object],
        tooManyLines: [Object],
        tooManyDependencies: [Object],
        isUnused: false,
        circularDependencySources: []
      },
      isUnused: false,
      circularDependencySources: []
    },
    {
      path: '/home/joeldemort/dev/shipwriter/backend/src/characters/characters.service.spec.ts',
      sourceCode: "import { Test, TestingModule } from '@nestjs/testing';\n" +
        "import { CharactersService } from './characters.service';\n" +
        '\n' +
        "describe('CharactersService', () => {\n" +
        '  let service: CharactersService;\n' +
        '\n' +
        '  beforeEach(async () => {\n' +
        '    const module: TestingModule = await Test.createTestingModule({\n' +
        '      providers: [CharactersService],\n' +
        '    }).compile();\n' +
        '\n' +
        '    service = module.get<CharactersService>(CharactersService);\n' +
        '  });\n' +
        '\n' +
        "  it('should be defined', () => {\n" +
        '    expect(service).toBeDefined();\n' +
        '  });\n' +
        '});\n',
      importSources: [
        '/home/joeldemort/dev/shipwriter/backend/src/characters/characters.service.ts'
      ],
      analysis: {
        tooManyChar: [Object],
        tooManyLines: [Object],
        tooManyDependencies: [Object],
        isUnused: false,
        circularDependencySources: []
      },
      isUnused: true,
      circularDependencySources: []
    },
    {
      path: '/home/joeldemort/dev/shipwriter/backend/src/characters/characters.service.ts',
      sourceCode: "import { Injectable } from '@nestjs/common';\n" +
        "import { InjectModel } from '@nestjs/mongoose';\n" +
        "import { Model } from 'mongoose';\n" +
        '\n' +
        "import { Character } from './characters.schema';\n" +
        "import { CharacterInput } from './characters.types';\n" +
        "import { FileService } from '../file.service';\n" +
        '\n' +
        '@Injectable()\n' +
        'export class CharactersService {\n' +
        '  constructor(\n' +
        '    @InjectModel(Character.name) private characterModel: Model<Character>,\n' +
        '    private readonly fileService: FileService,\n' +
        '  ) {}\n' +
        '\n' +
        '  async getAll(userId: string, writingId?: string): Promise<Character[]> {\n' +
        '    const getCharactersQuery: any = { userId };\n' +
        '    if (writingId) {\n' +
        '      getCharactersQuery.writingId = writingId;\n' +
        '    }\n' +
        '\n' +
        '    return await this.characterModel\n' +
        '      .find(getCharactersQuery)\n' +
        "      .select(['-content', '-imageUrl', '-voiceUrl'])\n" +
        '      .exec();\n' +
        '  }\n' +
        '\n' +
        '  async getById(id: string, userId: string): Promise<Character> {\n' +
        '    const character = await this.characterModel\n' +
        '      .findOne({ _id: id, userId })\n' +
        '      .exec();\n' +
        '\n' +
        '    if (!character) {\n' +
        "      throw new Error('Character not found');\n" +
        '    }\n' +
        '\n' +
        '    if (character.imageUrl) {\n' +
        '      character.imageUrl = await this.fileService.getPresignedUrl(\n' +
        '        character.imageUrl,\n' +
        '      );\n' +
        '    }\n' +
        '    if (character.voiceUrl) {\n' +
        '      character.voiceUrl = await this.fileService.getPresignedUrl(\n' +
        '        character.voiceUrl,\n' +
        '      );\n' +
        '    }\n' +
        '\n' +
        '    return character;\n' +
        '  }\n' +
        '\n' +
        '  async create(\n' +
        '    userId: string,\n' +
        '    characterData: CharacterInput,\n' +
        '  ): Promise<Character> {\n' +
        '    (characterData as Character).userId = userId;\n' +
        '    const newCharacter = new this.characterModel(characterData);\n' +
        '    return await newCharacter.save();\n' +
        '  }\n' +
        '\n' +
        '  async updateById(\n' +
        '    id: string,\n' +
        '    userId: string,\n' +
        '    characterData: CharacterInput,\n' +
        '  ): Promise<Character> {\n' +
        '    const character = await this.characterModel\n' +
        '      .findOneAndUpdate({ _id: id, userId }, characterData, { new: true })\n' +
        '      .exec();\n' +
        '\n' +
        '    if (!character) {\n' +
        "      throw new Error('Character not found');\n" +
        '    }\n' +
        '\n' +
        '    return character;\n' +
        '  }\n' +
        '\n' +
        '  async deleteById(id: string, userId: string): Promise<boolean> {\n' +
        '    const deleted = await this.characterModel\n' +
        '      .deleteOne({ _id: id, userId })\n' +
        '      .exec();\n' +
        '\n' +
        '    if (!deleted) {\n' +
        "      throw new Error('Character not found');\n" +
        '    }\n' +
        '\n' +
        '    return true;\n' +
        '  }\n' +
        '\n' +
        '  async getCharacterTags(\n' +
        '    userId: string,\n' +
        '    writingId?: string,\n' +
        '  ): Promise<string[]> {\n' +
        '    const characterFilter: any = { userId };\n' +
        '\n' +
        '    if (writingId) {\n' +
        '      characterFilter.writingId = writingId;\n' +
        '    }\n' +
        '\n' +
        '    const characters = await this.characterModel\n' +
        '      .find(characterFilter)\n' +
        "      .select(['_id', 'tags'])\n" +
        '      .exec();\n' +
        '\n' +
        '    if (!characters) {\n' +
        "      throw new Error('Characters not found');\n" +
        '    }\n' +
        '\n' +
        '    const htmlLinkTags = characters.map((character) => {\n' +
        '      return character.tags.map((name) => {\n' +
        '        return {\n' +
        '          name,\n' +
        '          url: `/characters/${character._id}`,\n' +
        '        };\n' +
        '      });\n' +
        '    });\n' +
        '\n' +
        '    // Flatten the array\n' +
        '    const flatTags = [].concat(...htmlLinkTags);\n' +
        '\n' +
        '    // Sort the array so that the shortest tags are first\n' +
        '    return flatTags.sort((a, b) => a.name.length - b.name.length);\n' +
        '  }\n' +
        '\n' +
        '  async addImage(\n' +
        '    id: string,\n' +
        '    userId: string,\n' +
        '    imageData: Express.Multer.File,\n' +
        '  ): Promise<Character> {\n' +
        '    // First, find the character\n' +
        '    const character = await this.characterModel\n' +
        '      .findOne({ _id: id, userId })\n' +
        '      .exec();\n' +
        '\n' +
        '    if (!character) {\n' +
        "      throw new Error('Character not found');\n" +
        '    }\n' +
        '\n' +
        '    // If the character already has an image, delete it\n' +
        '    if (character.imageUrl) {\n' +
        '      await this.fileService.deleteFile(character.imageUrl);\n' +
        '      character.imageUrl = null;\n' +
        '    }\n' +
        '\n' +
        '    // Then, write the image to the object storage\n' +
        '    const filepath = this.buildFilePath(userId, id, imageData.originalname);\n' +
        '    const key = await this.fileService.uploadFile(filepath, imageData);\n' +
        '\n' +
        '    // Finally, update the character with the image URL\n' +
        '    character.imageUrl = key;\n' +
        '    await character.save();\n' +
        '\n' +
        '    return character;\n' +
        '  }\n' +
        '\n' +
        '  async addVoice(\n' +
        '    id: string,\n' +
        '    userId: string,\n' +
        '    voiceData: Express.Multer.File,\n' +
        '  ): Promise<Character> {\n' +
        '    // First, find the character\n' +
        '    const character = await this.characterModel\n' +
        '      .findOne({ _id: id, userId })\n' +
        '      .exec();\n' +
        '\n' +
        '    if (!character) {\n' +
        "      throw new Error('Character not found');\n" +
        '    }\n' +
        '\n' +
        '    // If the character already has a voice recording, delete it\n' +
        '    if (character.voiceUrl) {\n' +
        '      await this.fileService.deleteFile(character.voiceUrl);\n' +
        '      character.voiceUrl = null;\n' +
        '    }\n' +
        '\n' +
        '    // Then, write the voice recording to the object storage\n' +
        "    const filepath = this.buildFilePath(userId, id, 'voice.webm');\n" +
        '    const key = await this.fileService.uploadFile(filepath, voiceData);\n' +
        '\n' +
        '    // Finally, update the character with the voice URL\n' +
        '    character.voiceUrl = key;\n' +
        '    await character.save();\n' +
        '\n' +
        '    return character;\n' +
        '  }\n' +
        '\n' +
        '  buildFilePath(userId: string, itemId: string, filename: string): string {\n' +
        '    return `${userId}/${itemId}-${filename}`;\n' +
        '  }\n' +
        '}\n',
      importSources: [
        '/home/joeldemort/dev/shipwriter/backend/src/characters/characters.schema.ts',
        '/home/joeldemort/dev/shipwriter/backend/src/characters/characters.types.ts',
        '/home/joeldemort/dev/shipwriter/backend/src/file.service.ts'
      ],
      analysis: {
        tooManyChar: [Object],
        tooManyLines: [Object],
        tooManyDependencies: [Object],
        isUnused: false,
        circularDependencySources: []
      },
      isUnused: false,
      circularDependencySources: []
    },
    {
      path: '/home/joeldemort/dev/shipwriter/backend/src/characters/characters.types.ts',
      sourceCode: 'export type CharacterInput = {\n' +
        '  name: string;\n' +
        '  attributes?: object;\n' +
        '  vlees?: {\n' +
        '    want: string;\n' +
        '    need: string;\n' +
        '    drive: string;\n' +
        '    secrets: string[];\n' +
        '    flaw: string;\n' +
        '    strength: string;\n' +
        '    cost: string;\n' +
        '  };\n' +
        '  details: string;\n' +
        '  tags: string[];\n' +
        '  imageUrl: string;\n' +
        '  voiceUrl: string;\n' +
        '};\n',
      importSources: [],
      analysis: {
        tooManyChar: [Object],
        tooManyLines: [Object],
        tooManyDependencies: [Object],
        isUnused: false,
        circularDependencySources: []
      },
      isUnused: false,
      circularDependencySources: []
    },
    {
      path: '/home/joeldemort/dev/shipwriter/backend/src/config.ts',
      sourceCode: 'export default Object.freeze({\n' +
        '  port: parseInt(process.env.PORT, 10) || 2727,\n' +
        '  dbUrl:\n' +
        '    process.env.DATABASE_URL ||\n' +
        "    'mongodb+srv://nanoapiorg:J5jEq9IuBnTaBXj8@shipwriter-cluster.tykgfmz.mongodb.net/?retryWrites=true&w=majority&appName=shipwriter-cluster',\n" +
        '  privateKey:\n' +
        '    // process.env.PRIVATE_KEY ||\n' +
        "    '5dc7fjoaw9iflee9fwc9wrblemcsdir2m',\n" +
        "  awsRegion: process.env.AWS_REGION || 'eu-west-1',\n" +
        "  s3BucketName: process.env.S3_BUCKET_NAME || 'shipwriter-files',\n" +
        '  awsAccessKeyId: process.env.AWS_ACCESS_KEY_ID,\n' +
        '  awsAccessKeySecret: process.env.AWS_SECRET_ACCESS_KEY,\n' +
        '});\n',
      importSources: [],
      analysis: {
        tooManyChar: [Object],
        tooManyLines: [Object],
        tooManyDependencies: [Object],
        isUnused: false,
        circularDependencySources: []
      },
      isUnused: false,
      circularDependencySources: []
    },
    {
      path: '/home/joeldemort/dev/shipwriter/backend/src/file.service.ts',
      sourceCode: "import { Injectable } from '@nestjs/common';\n" +
        'import {\n' +
        '  S3Client,\n' +
        '  PutObjectCommand,\n' +
        '  GetObjectCommand,\n' +
        '  DeleteObjectCommand,\n' +
        "} from '@aws-sdk/client-s3';\n" +
        "import { getSignedUrl } from '@aws-sdk/s3-request-presigner';\n" +
        '\n' +
        "import config from './config';\n" +
        '\n' +
        '@Injectable()\n' +
        'export class FileService {\n' +
        '  private s3BucketName: string;\n' +
        '  private s3: S3Client;\n' +
        '\n' +
        '  constructor() {\n' +
        '    this.s3BucketName = config.s3BucketName;\n' +
        '    this.s3 = new S3Client({\n' +
        '      region: config.awsRegion,\n' +
        '      credentials: {\n' +
        '        accessKeyId: config.awsAccessKeyId,\n' +
        '        secretAccessKey: config.awsAccessKeySecret,\n' +
        '      },\n' +
        '    });\n' +
        '  }\n' +
        '\n' +
        '  async uploadFile(\n' +
        '    filepath: string,\n' +
        '    file: Express.Multer.File,\n' +
        '  ): Promise<string> {\n' +
        '    const key = filepath;\n' +
        '\n' +
        '    const command = new PutObjectCommand({\n' +
        '      Bucket: this.s3BucketName,\n' +
        '      Key: key,\n' +
        '      Body: file.buffer,\n' +
        '      ContentType: file.mimetype,\n' +
        '    });\n' +
        '\n' +
        '    await this.s3.send(command);\n' +
        '\n' +
        '    return key;\n' +
        '  }\n' +
        '\n' +
        '  async getFile(key: string): Promise<ReadableStream> {\n' +
        '    const command = new GetObjectCommand({\n' +
        '      Bucket: this.s3BucketName,\n' +
        '      Key: key,\n' +
        '    });\n' +
        '\n' +
        '    const response = await this.s3.send(command);\n' +
        '\n' +
        '    return response.Body.transformToWebStream();\n' +
        '  }\n' +
        '\n' +
        '  async getPresignedUrl(key: string): Promise<string> {\n' +
        '    const command = new GetObjectCommand({\n' +
        '      Bucket: this.s3BucketName,\n' +
        '      Key: key,\n' +
        '    });\n' +
        '\n' +
        '    return await getSignedUrl(this.s3, command, { expiresIn: 3600 });\n' +
        '  }\n' +
        '\n' +
        '  async deleteFile(key: string): Promise<void> {\n' +
        '    const command = new DeleteObjectCommand({\n' +
        '      Bucket: this.s3BucketName,\n' +
        '      Key: key,\n' +
        '    });\n' +
        '\n' +
        '    await this.s3.send(command);\n' +
        '  }\n' +
        '}\n',
      importSources: [ '/home/joeldemort/dev/shipwriter/backend/src/config.ts' ],
      analysis: {
        tooManyChar: [Object],
        tooManyLines: [Object],
        tooManyDependencies: [Object],
        isUnused: false,
        circularDependencySources: []
      },
      isUnused: false,
      circularDependencySources: []
    },
    {
      path: '/home/joeldemort/dev/shipwriter/backend/src/main.ts',
      sourceCode: "import 'dotenv/config';\n" +
        '\n' +
        "import { NestFactory } from '@nestjs/core';\n" +
        "import { AppModule } from './app.module';\n" +
        '\n' +
        "import config from './config';\n" +
        '\n' +
        'async function bootstrap() {\n' +
        '  const app = await NestFactory.create(AppModule);\n' +
        "  app.setGlobalPrefix('api/v1');\n" +
        '  app.enableCors();\n' +
        '  await app.listen(config.port);\n' +
        '}\n' +
        'bootstrap();\n',
      importSources: [
        '/home/joeldemort/dev/shipwriter/backend/src/app.module.ts',
        '/home/joeldemort/dev/shipwriter/backend/src/config.ts'
      ],
      analysis: {
        tooManyChar: [Object],
        tooManyLines: [Object],
        tooManyDependencies: [Object],
        isUnused: false,
        circularDependencySources: []
      },
      isUnused: true,
      circularDependencySources: []
    },
    {
      path: '/home/joeldemort/dev/shipwriter/backend/src/prisma.service.ts',
      sourceCode: "import { Injectable } from '@nestjs/common';\n" +
        "import { PrismaClient } from '@prisma/client';\n" +
        '\n' +
        '@Injectable()\n' +
        'export class PrismaService extends PrismaClient {\n' +
        '  async checkDatabaseConnection(): Promise<boolean> {\n' +
        '    try {\n' +
        '      await this.$connect(); // Attempt to connect to the database\n' +
        '      await this.$queryRaw`SELECT 1`; // Execute a simple test query\n' +
        '      await this.$disconnect(); // Disconnect to clean up the connection\n' +
        '      return true; // Connection successful\n' +
        '    } catch (error) {\n' +
        "      console.error('Database connection check failed', error);\n" +
        '      return false; // Connection failed\n' +
        '    }\n' +
        '  }\n' +
        '}\n',
      importSources: [],
      analysis: {
        tooManyChar: [Object],
        tooManyLines: [Object],
        tooManyDependencies: [Object],
        isUnused: false,
        circularDependencySources: []
      },
      isUnused: true,
      circularDependencySources: []
    },
    {
      path: '/home/joeldemort/dev/shipwriter/backend/src/users/users.controller.spec.ts',
      sourceCode: "import { Test, TestingModule } from '@nestjs/testing';\n" +
        "import { UsersController } from './users.controller';\n" +
        '\n' +
        "describe('UsersController', () => {\n" +
        '  let controller: UsersController;\n' +
        '\n' +
        '  beforeEach(async () => {\n' +
        '    const module: TestingModule = await Test.createTestingModule({\n' +
        '      controllers: [UsersController],\n' +
        '    }).compile();\n' +
        '\n' +
        '    controller = module.get<UsersController>(UsersController);\n' +
        '  });\n' +
        '\n' +
        "  it('should be defined', () => {\n" +
        '    expect(controller).toBeDefined();\n' +
        '  });\n' +
        '});\n',
      importSources: [
        '/home/joeldemort/dev/shipwriter/backend/src/users/users.controller.ts'
      ],
      analysis: {
        tooManyChar: [Object],
        tooManyLines: [Object],
        tooManyDependencies: [Object],
        isUnused: false,
        circularDependencySources: []
      },
      isUnused: true,
      circularDependencySources: []
    },
    {
      path: '/home/joeldemort/dev/shipwriter/backend/src/users/users.controller.ts',
      sourceCode: 'import {\n' +
        '  Body,\n' +
        '  Controller,\n' +
        '  Post,\n' +
        '  Req,\n' +
        '  Res,\n' +
        '  Logger,\n' +
        '  Put,\n' +
        '  Get,\n' +
        "} from '@nestjs/common';\n" +
        '\n' +
        "import UsersService from './users.service';\n" +
        "import { DuplicateUserError, UserInput } from './users.types';\n" +
        '\n' +
        "@Controller('users')\n" +
        'export class UsersController {\n' +
        '  constructor(private readonly usersService: UsersService) {}\n' +
        '\n' +
        '  // @nanoapi method:POST path:/api/v1/users/register group:auth\n' +
        "  @Post('register')\n" +
        '  async register(@Body() userData: UserInput, @Res() res) {\n' +
        '    let createdUser;\n' +
        '    try {\n' +
        '      createdUser = await this.usersService.registerNewUser(userData);\n' +
        '    } catch (e) {\n' +
        '      Logger.error(e);\n' +
        '      if (e instanceof DuplicateUserError) {\n' +
        "        return res.status(400).send('A user with that email already exists.');\n" +
        '      }\n' +
        '\n' +
        "      return res.status(500).send('An error occurred when creating the user.');\n" +
        '    }\n' +
        '\n' +
        '    return res.json(createdUser.toJSON());\n' +
        '  }\n' +
        '\n' +
        '  // @nanoapi method:PUT path:/api/v1/users/goal group:auth\n' +
        "  @Put('goal')\n" +
        '  async updateGoal(@Body() userData: { goal: number }, @Req() req, @Res() res) {\n' +
        "    const userId = req.headers['x-user-id'];\n" +
        '    let updatedUser;\n' +
        '    try {\n' +
        '      updatedUser = await this.usersService.updateUserGoals(\n' +
        '        userId,\n' +
        '        userData.goal,\n' +
        '      );\n' +
        '    } catch (e) {\n' +
        '      Logger.error(e);\n' +
        '      return res\n' +
        '        .status(500)\n' +
        "        .send('An error occurred when updating the user goal.');\n" +
        '    }\n' +
        '\n' +
        '    return res.json(updatedUser.toJSON());\n' +
        '  }\n' +
        '\n' +
        '  // @nanoapi method:GET path:/api/v1/users/me group:auth\n' +
        "  @Get('me')\n" +
        '  async getMe(@Req() req, @Res() res) {\n' +
        "    const userId = req.headers['x-user-id'];\n" +
        '    let user;\n' +
        '    try {\n' +
        '      user = await this.usersService.getUserById(userId);\n' +
        '    } catch (e) {\n' +
        '      Logger.error(e);\n' +
        "      return res.status(500).send('An error occurred when fetching the user.');\n" +
        '    }\n' +
        '\n' +
        '    return res.json(user.toJSON());\n' +
        '  }\n' +
        '}\n',
      importSources: [
        '/home/joeldemort/dev/shipwriter/backend/src/users/users.service.ts',
        '/home/joeldemort/dev/shipwriter/backend/src/users/users.types.ts'
      ],
      analysis: {
        tooManyChar: [Object],
        tooManyLines: [Object],
        tooManyDependencies: [Object],
        isUnused: false,
        circularDependencySources: []
      },
      isUnused: false,
      circularDependencySources: []
    },
    {
      path: '/home/joeldemort/dev/shipwriter/backend/src/users/users.module.ts',
      sourceCode: "import { Module } from '@nestjs/common';\n" +
        "import { MongooseModule } from '@nestjs/mongoose';\n" +
        "import { UsersController } from './users.controller';\n" +
        "import UsersService from './users.service';\n" +
        "import { User, UserSchema } from './users.schema';\n" +
        '\n' +
        '// @nanoapi path:/api/v1/users\n' +
        '@Module({\n' +
        '  imports: [\n' +
        '    MongooseModule.forFeature([{ name: User.name, schema: UserSchema }]),\n' +
        '  ],\n' +
        '  controllers: [UsersController],\n' +
        '  providers: [UsersService],\n' +
        '  exports: [UsersService],\n' +
        '})\n' +
        'export class UsersModule {}\n',
      importSources: [
        '/home/joeldemort/dev/shipwriter/backend/src/users/users.controller.ts',
        '/home/joeldemort/dev/shipwriter/backend/src/users/users.service.ts',
        '/home/joeldemort/dev/shipwriter/backend/src/users/users.schema.ts'
      ],
      analysis: {
        tooManyChar: [Object],
        tooManyLines: [Object],
        tooManyDependencies: [Object],
        isUnused: false,
        circularDependencySources: []
      },
      isUnused: false,
      circularDependencySources: []
    },
    {
      path: '/home/joeldemort/dev/shipwriter/backend/src/users/users.schema.ts',
      sourceCode: "import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';\n" +
        "import { HydratedDocument } from 'mongoose';\n" +
        '\n' +
        'export type UserDocument = HydratedDocument<User>;\n' +
        '\n' +
        '@Schema()\n' +
        'export class User {\n' +
        '  @Prop()\n' +
        '  username: string;\n' +
        '\n' +
        '  @Prop()\n' +
        '  email: string;\n' +
        '\n' +
        '  @Prop()\n' +
        '  password: string;\n' +
        '\n' +
        '  @Prop({ default: 2000 })\n' +
        '  goal: number;\n' +
        '}\n' +
        '\n' +
        'export const UserSchema = SchemaFactory.createForClass(User);\n',
      importSources: [],
      analysis: {
        tooManyChar: [Object],
        tooManyLines: [Object],
        tooManyDependencies: [Object],
        isUnused: false,
        circularDependencySources: []
      },
      isUnused: false,
      circularDependencySources: []
    },
    {
      path: '/home/joeldemort/dev/shipwriter/backend/src/users/users.service.spec.ts',
      sourceCode: "import { Test, TestingModule } from '@nestjs/testing';\n" +
        "import { UsersService } from './users.service';\n" +
        '\n' +
        "describe('UsersService', () => {\n" +
        '  let service: UsersService;\n' +
        '\n' +
        '  beforeEach(async () => {\n' +
        '    const module: TestingModule = await Test.createTestingModule({\n' +
        '      providers: [UsersService],\n' +
        '    }).compile();\n' +
        '\n' +
        '    service = module.get<UsersService>(UsersService);\n' +
        '  });\n' +
        '\n' +
        "  it('should be defined', () => {\n" +
        '    expect(service).toBeDefined();\n' +
        '  });\n' +
        '});\n',
      importSources: [
        '/home/joeldemort/dev/shipwriter/backend/src/users/users.service.ts'
      ],
      analysis: {
        tooManyChar: [Object],
        tooManyLines: [Object],
        tooManyDependencies: [Object],
        isUnused: false,
        circularDependencySources: []
      },
      isUnused: true,
      circularDependencySources: []
    },
    {
      path: '/home/joeldemort/dev/shipwriter/backend/src/users/users.service.ts',
      sourceCode: "import { Injectable } from '@nestjs/common';\n" +
        "import { InjectModel } from '@nestjs/mongoose';\n" +
        "import { Model } from 'mongoose';\n" +
        "import * as bcrypt from 'bcrypt';\n" +
        '\n' +
        "import { User } from './users.schema';\n" +
        "import { UserNotFoundError, UserInput } from './users.types';\n" +
        '\n' +
        '@Injectable()\n' +
        'export default class UsersService {\n' +
        '  constructor(@InjectModel(User.name) private userModel: Model<User>) {}\n' +
        '\n' +
        '  async getUserById(id: string): Promise<User> {\n' +
        "    const dbUser = await this.userModel.findById(id).select('-password').exec();\n" +
        '    if (!dbUser) {\n' +
        '      throw new UserNotFoundError(`Unable to find user with ID: ${id}`);\n' +
        '    }\n' +
        '\n' +
        "    // TODO: DON'T DO THIS. Remove this code. Used for migration purposes only for now.\n" +
        '    if (dbUser.goal === undefined || dbUser.goal === null) {\n' +
        '      dbUser.goal = 2000;\n' +
        '      await dbUser.save();\n' +
        '    }\n' +
        '\n' +
        '    return dbUser;\n' +
        '  }\n' +
        '\n' +
        '  async getUserByEmail(email: string): Promise<User> {\n' +
        '    const dbUser = await this.userModel.findOne({ email }).exec();\n' +
        '    if (!dbUser) {\n' +
        '      throw new UserNotFoundError(`Unable to find user with email: ${email}`);\n' +
        '    }\n' +
        '\n' +
        '    return dbUser;\n' +
        '  }\n' +
        '\n' +
        '  async getUserByUsername(username: string): Promise<User> {\n' +
        '    const dbUser = await this.userModel.findOne({ username }).exec();\n' +
        '    if (!dbUser) {\n' +
        '      throw new UserNotFoundError(\n' +
        '        `Unable to find user with username: ${username}`,\n' +
        '      );\n' +
        '    }\n' +
        '\n' +
        '    return dbUser;\n' +
        '  }\n' +
        '\n' +
        '  async registerNewUser(data: UserInput): Promise<User> {\n' +
        '    const salt = await bcrypt.genSalt(10);\n' +
        '    const password = await bcrypt.hash(data.password, salt);\n' +
        '\n' +
        '    const { username, email } = data;\n' +
        '    const newUser = new this.userModel({\n' +
        '      username,\n' +
        '      email,\n' +
        '      password,\n' +
        '      goal: data.goal || 2000,\n' +
        '    });\n' +
        '    return newUser.save();\n' +
        '  }\n' +
        '\n' +
        '  async updateUserGoals(userId: string, goal: number): Promise<User> {\n' +
        '    const user = await this.userModel.findById(userId).exec();\n' +
        '    if (!user) {\n' +
        '      throw new UserNotFoundError(`Unable to find user with ID: ${userId}`);\n' +
        '    }\n' +
        '\n' +
        '    user.goal = goal;\n' +
        '    return user.save();\n' +
        '  }\n' +
        '}\n',
      importSources: [
        '/home/joeldemort/dev/shipwriter/backend/src/users/users.schema.ts',
        '/home/joeldemort/dev/shipwriter/backend/src/users/users.types.ts'
      ],
      analysis: {
        tooManyChar: [Object],
        tooManyLines: [Object],
        tooManyDependencies: [Object],
        isUnused: false,
        circularDependencySources: []
      },
      isUnused: false,
      circularDependencySources: []
    },
    {
      path: '/home/joeldemort/dev/shipwriter/backend/src/users/users.types.ts',
      sourceCode: 'export class UserNotFoundError extends Error {\n' +
        '  constructor(message) {\n' +
        '    super(message);\n' +
        "    this.name = 'UserNotFoundError';\n" +
        '  }\n' +
        '}\n' +
        '\n' +
        'export class DuplicateUserError extends Error {\n' +
        '  constructor(message) {\n' +
        '    super(message);\n' +
        "    this.name = 'DuplicateUserError';\n" +
        '  }\n' +
        '}\n' +
        '\n' +
        'export class UserUpsertError extends Error {\n' +
        '  constructor(message) {\n' +
        '    super(message);\n' +
        "    this.name = 'UserUpsertError';\n" +
        '  }\n' +
        '}\n' +
        '\n' +
        'export type UserInput = {\n' +
        '  username: string;\n' +
        '  email: string;\n' +
        '  password: string;\n' +
        '  goal?: number;\n' +
        '};\n',
      importSources: [],
      analysis: {
        tooManyChar: [Object],
        tooManyLines: [Object],
        tooManyDependencies: [Object],
        isUnused: false,
        circularDependencySources: []
      },
      isUnused: false,
      circularDependencySources: []
    },
    {
      path: '/home/joeldemort/dev/shipwriter/backend/src/writing/word-count.schema.ts',
      sourceCode: "import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';\n" +
        "import { HydratedDocument } from 'mongoose';\n" +
        '\n' +
        'export type WordCountSchema = HydratedDocument<WordCount>;\n' +
        '\n' +
        '@Schema()\n' +
        'export class WordCount {\n' +
        '  @Prop()\n' +
        '  writingId: string;\n' +
        '\n' +
        '  @Prop()\n' +
        '  userId: string;\n' +
        '\n' +
        '  @Prop()\n' +
        '  count: number;\n' +
        '\n' +
        '  @Prop()\n' +
        '  createdAt: Date;\n' +
        '}\n' +
        '\n' +
        'export const WordCountSchema = SchemaFactory.createForClass(WordCount);\n',
      importSources: [],
      analysis: {
        tooManyChar: [Object],
        tooManyLines: [Object],
        tooManyDependencies: [Object],
        isUnused: false,
        circularDependencySources: []
      },
      isUnused: false,
      circularDependencySources: []
    },
    {
      path: '/home/joeldemort/dev/shipwriter/backend/src/writing/writing.controller.spec.ts',
      sourceCode: "import { Test, TestingModule } from '@nestjs/testing';\n" +
        "import { WritingController } from './writing.controller';\n" +
        '\n' +
        "describe('WritingController', () => {\n" +
        '  let controller: WritingController;\n' +
        '\n' +
        '  beforeEach(async () => {\n' +
        '    const module: TestingModule = await Test.createTestingModule({\n' +
        '      controllers: [WritingController],\n' +
        '    }).compile();\n' +
        '\n' +
        '    controller = module.get<WritingController>(WritingController);\n' +
        '  });\n' +
        '\n' +
        "  it('should be defined', () => {\n" +
        '    expect(controller).toBeDefined();\n' +
        '  });\n' +
        '});\n',
      importSources: [
        '/home/joeldemort/dev/shipwriter/backend/src/writing/writing.controller.ts'
      ],
      analysis: {
        tooManyChar: [Object],
        tooManyLines: [Object],
        tooManyDependencies: [Object],
        isUnused: false,
        circularDependencySources: []
      },
      isUnused: true,
      circularDependencySources: []
    },
    {
      path: '/home/joeldemort/dev/shipwriter/backend/src/writing/writing.controller.ts',
      sourceCode: 'import {\n' +
        '  Body,\n' +
        '  Controller,\n' +
        '  Get,\n' +
        '  Param,\n' +
        '  Put,\n' +
        '  Post,\n' +
        '  Req,\n' +
        '  Res,\n' +
        '  Logger,\n' +
        "} from '@nestjs/common';\n" +
        '\n' +
        "import { WritingService } from './writing.service';\n" +
        "import { WritingInput } from './writing.types';\n" +
        '\n' +
        "@Controller('writing')\n" +
        'export class WritingController {\n' +
        '  constructor(private readonly writingService: WritingService) {}\n' +
        '\n' +
        '  // @nanoapi method:GET path:/api/v1/writing/metrics\n' +
        "  @Get('metrics/count')\n" +
        '  async wordMetrics(@Req() req, @Res() res) {\n' +
        "    const userId = req.headers['x-user-id'];\n" +
        '    let metrics;\n' +
        '    try {\n' +
        '      metrics = await this.writingService.getWordMetrics(userId);\n' +
        '    } catch (e) {\n' +
        '      Logger.error(e);\n' +
        '      return res\n' +
        '        .status(500)\n' +
        "        .send('An error occurred when fetching the word metrics.');\n" +
        '    }\n' +
        '\n' +
        '    return res.json(metrics);\n' +
        '  }\n' +
        '\n' +
        '  // @nanoapi method:GET path:/api/v1/writing/metrics\n' +
        "  @Get('metrics/heatmap')\n" +
        '  async heatmap(@Req() req, @Res() res) {\n' +
        "    const userId = req.headers['x-user-id'];\n" +
        '    let heatmap;\n' +
        '    try {\n' +
        '      heatmap = await this.writingService.getHeatmapMetrics(userId);\n' +
        '    } catch (e) {\n' +
        '      Logger.error(e);\n' +
        '      return res\n' +
        '        .status(500)\n' +
        "        .send('An error occurred when fetching the heatmap.');\n" +
        '    }\n' +
        '\n' +
        '    // Returns: [{ date: "2021-01-01": value: 100 }, ... ]\n' +
        '    return res.json(heatmap);\n' +
        '  }\n' +
        '\n' +
        '  // @nanoapi method:POST path:/api/v1/writing\n' +
        '  @Post()\n' +
        '  async create(@Req() req, @Body() writingData: WritingInput, @Res() res) {\n' +
        "    const userId = req.headers['x-user-id'];\n" +
        '    Logger.log(req.body);\n' +
        '    let createdWriting;\n' +
        '    try {\n' +
        '      createdWriting = await this.writingService.create(userId, writingData);\n' +
        '    } catch (e) {\n' +
        '      Logger.error(e);\n' +
        '      return res\n' +
        '        .status(500)\n' +
        "        .send('An error occurred when creating the writing.');\n" +
        '    }\n' +
        '\n' +
        '    return res.json(createdWriting);\n' +
        '  }\n' +
        '\n' +
        '  // @nanoapi method:GET path:/api/v1/writing\n' +
        '  @Get()\n' +
        '  async getAll(@Res() res, @Req() req) {\n' +
        "    const userId = req.headers['x-user-id'];\n" +
        '    let writings;\n' +
        '    try {\n' +
        '      writings = await this.writingService.getAll(userId);\n' +
        '    } catch (e) {\n' +
        '      Logger.error(e);\n' +
        '      return res\n' +
        '        .status(500)\n' +
        "        .send('An error occurred when fetching the writings.');\n" +
        '    }\n' +
        '\n' +
        '    return res.json(writings);\n' +
        '  }\n' +
        '\n' +
        '  // @nanoapi method:GET path:/api/v1/writing/:id\n' +
        "  @Get(':id')\n" +
        "  async getById(@Req() req, @Res() res, @Param('id') id: string) {\n" +
        "    const userId = req.headers['x-user-id'];\n" +
        '    let writing;\n' +
        '    try {\n' +
        '      writing = await this.writingService.getById(id, userId);\n' +
        '    } catch (e) {\n' +
        '      Logger.error(e);\n' +
        '      return res\n' +
        '        .status(500)\n' +
        "        .send('An error occurred when fetching the writing.');\n" +
        '    }\n' +
        '\n' +
        '    return res.json(writing);\n' +
        '  }\n' +
        '\n' +
        '  // @nanoapi method:PUT path:/api/v1/writing/:id\n' +
        "  @Put(':id')\n" +
        '  async updateById(\n' +
        '    @Req() req,\n' +
        '    @Res() res,\n' +
        "    @Param('id') id: string,\n" +
        '    @Body() writingData: WritingInput,\n' +
        '  ) {\n' +
        "    const userId = req.headers['x-user-id'];\n" +
        '\n' +
        '    // The new format will be deltas in the future. For now, we need to convert the content to a string.\n' +
        '    if (writingData.content && (writingData.content as any) instanceof Array) {\n' +
        '      writingData.content = JSON.stringify(writingData.content);\n' +
        '    }\n' +
        '\n' +
        '    let updatedWriting;\n' +
        '    try {\n' +
        '      updatedWriting = await this.writingService.updateById(\n' +
        '        id,\n' +
        '        userId,\n' +
        '        writingData,\n' +
        '      );\n' +
        '    } catch (e) {\n' +
        '      Logger.error(e);\n' +
        '      return res\n' +
        '        .status(500)\n' +
        "        .send('An error occurred when updating the writing.');\n" +
        '    }\n' +
        '\n' +
        '    return res.json(updatedWriting);\n' +
        '  }\n' +
        '}\n',
      importSources: [
        '/home/joeldemort/dev/shipwriter/backend/src/writing/writing.service.ts',
        '/home/joeldemort/dev/shipwriter/backend/src/writing/writing.types.ts'
      ],
      analysis: {
        tooManyChar: [Object],
        tooManyLines: [Object],
        tooManyDependencies: [Object],
        isUnused: false,
        circularDependencySources: []
      },
      isUnused: false,
      circularDependencySources: []
    },
    {
      path: '/home/joeldemort/dev/shipwriter/backend/src/writing/writing.module.ts',
      sourceCode: "import { Module } from '@nestjs/common';\n" +
        "import { MongooseModule } from '@nestjs/mongoose';\n" +
        "import { WritingController } from './writing.controller';\n" +
        "import { WritingService } from './writing.service';\n" +
        "import { Writing, WritingSchema } from './writing.schema';\n" +
        "import { WordCount, WordCountSchema } from './word-count.schema';\n" +
        '\n' +
        '// @nanoapi path:/api/v1/writing\n' +
        '@Module({\n' +
        '  imports: [\n' +
        '    MongooseModule.forFeature([{ name: Writing.name, schema: WritingSchema }]),\n' +
        '    MongooseModule.forFeature([\n' +
        '      { name: WordCount.name, schema: WordCountSchema },\n' +
        '    ]),\n' +
        '  ],\n' +
        '  controllers: [WritingController],\n' +
        '  providers: [WritingService],\n' +
        '  exports: [WritingService],\n' +
        '})\n' +
        'export class WritingModule {}\n',
      importSources: [
        '/home/joeldemort/dev/shipwriter/backend/src/writing/writing.controller.ts',
        '/home/joeldemort/dev/shipwriter/backend/src/writing/writing.service.ts',
        '/home/joeldemort/dev/shipwriter/backend/src/writing/writing.schema.ts',
        '/home/joeldemort/dev/shipwriter/backend/src/writing/word-count.schema.ts'
      ],
      analysis: {
        tooManyChar: [Object],
        tooManyLines: [Object],
        tooManyDependencies: [Object],
        isUnused: false,
        circularDependencySources: []
      },
      isUnused: false,
      circularDependencySources: []
    },
    {
      path: '/home/joeldemort/dev/shipwriter/backend/src/writing/writing.schema.ts',
      sourceCode: "import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';\n" +
        "import { HydratedDocument } from 'mongoose';\n" +
        '\n' +
        'export type WritingDocument = HydratedDocument<Writing>;\n' +
        '\n' +
        '@Schema()\n' +
        'export class Writing {\n' +
        '  @Prop()\n' +
        '  title: string;\n' +
        '\n' +
        '  @Prop()\n' +
        '  content: string;\n' +
        '\n' +
        '  @Prop()\n' +
        '  introExcerpt: string;\n' +
        '\n' +
        '  @Prop()\n' +
        '  wordCount: number;\n' +
        '\n' +
        '  @Prop()\n' +
        '  userId: string;\n' +
        '\n' +
        '  @Prop()\n' +
        '  createdAt: Date;\n' +
        '\n' +
        '  @Prop()\n' +
        '  updatedAt: Date;\n' +
        '}\n' +
        '\n' +
        'export const WritingSchema = SchemaFactory.createForClass(Writing);\n',
      importSources: [],
      analysis: {
        tooManyChar: [Object],
        tooManyLines: [Object],
        tooManyDependencies: [Object],
        isUnused: false,
        circularDependencySources: []
      },
      isUnused: false,
      circularDependencySources: []
    },
    {
      path: '/home/joeldemort/dev/shipwriter/backend/src/writing/writing.service.spec.ts',
      sourceCode: "import { Test, TestingModule } from '@nestjs/testing';\n" +
        "import { WritingService } from './writing.service';\n" +
        '\n' +
        "describe('WritingService', () => {\n" +
        '  let service: WritingService;\n' +
        '\n' +
        '  beforeEach(async () => {\n' +
        '    const module: TestingModule = await Test.createTestingModule({\n' +
        '      providers: [WritingService],\n' +
        '    }).compile();\n' +
        '\n' +
        '    service = module.get<WritingService>(WritingService);\n' +
        '  });\n' +
        '\n' +
        "  it('should be defined', () => {\n" +
        '    expect(service).toBeDefined();\n' +
        '  });\n' +
        '});\n',
      importSources: [
        '/home/joeldemort/dev/shipwriter/backend/src/writing/writing.service.ts'
      ],
      analysis: {
        tooManyChar: [Object],
        tooManyLines: [Object],
        tooManyDependencies: [Object],
        isUnused: false,
        circularDependencySources: []
      },
      isUnused: true,
      circularDependencySources: []
    },
    {
      path: '/home/joeldemort/dev/shipwriter/backend/src/writing/writing.service.ts',
      sourceCode: "import { Injectable, Logger } from '@nestjs/common';\n" +
        "import { InjectModel } from '@nestjs/mongoose';\n" +
        "import { Model } from 'mongoose';\n" +
        "import { Writing } from './writing.schema';\n" +
        "import { WordCount } from './word-count.schema';\n" +
        "import { WritingInput } from './writing.types';\n" +
        '\n' +
        '@Injectable()\n' +
        'export class WritingService {\n' +
        '  constructor(\n' +
        '    @InjectModel(Writing.name) private writingModel: Model<Writing>,\n' +
        '    @InjectModel(WordCount.name) private wordCountModel: Model<WordCount>,\n' +
        '  ) {}\n' +
        '\n' +
        '  async create(userId: string, writingData: WritingInput): Promise<Writing> {\n' +
        '    const writingDataWithUserId = { ...writingData, userId };\n' +
        '    const newWriting = new this.writingModel(writingDataWithUserId);\n' +
        '    return await newWriting.save();\n' +
        '  }\n' +
        '\n' +
        '  async getAll(userId: string): Promise<Writing[]> {\n' +
        "    return await this.writingModel.find({ userId }).select('-content').exec();\n" +
        '  }\n' +
        '\n' +
        '  // eslint-disable-next-line @typescript-eslint/no-unused-vars\n' +
        '  async getById(id: string, _userid: string): Promise<Writing> {\n' +
        '    return await this.writingModel.findById(id).exec();\n' +
        '  }\n' +
        '\n' +
        '  async updateById(\n' +
        '    id: string,\n' +
        '    userId: string,\n' +
        '    writingData: WritingInput,\n' +
        '  ): Promise<Writing> {\n' +
        '    const writing = await this.writingModel.findOne({ _id: id, userId }).exec();\n' +
        '\n' +
        '    if (!writing) {\n' +
        "      throw new Error('Writing not found');\n" +
        '    }\n' +
        '\n' +
        '    const latestCount = parseInt(writingData.wordCount, 10);\n' +
        '\n' +
        '    this.addWordCount(\n' +
        '      id,\n' +
        '      userId,\n' +
        '      latestCount,\n' +
        '      writing.wordCount || 0,\n' +
        '      writingData.userTimestamp,\n' +
        "    ); // Don't wait for this to finish\n" +
        '\n' +
        '    writing.wordCount = latestCount;\n' +
        '\n' +
        '    if (writing.title !== writingData.title) {\n' +
        '      writing.title = writingData.title;\n' +
        '    } else {\n' +
        '      writing.content = writingData.content;\n' +
        '      try {\n' +
        '        const content = JSON.parse(writingData.content);\n' +
        '        writing.introExcerpt = this.convertFromDelta(content);\n' +
        '        Logger.log(writing.introExcerpt.length);\n' +
        '      } catch (e) {\n' +
        '        const content = this.stripHtmlTags(writingData.content);\n' +
        '        writing.introExcerpt = content.slice(0, 140);\n' +
        '      }\n' +
        '    }\n' +
        '\n' +
        '    writing.updatedAt = writingData.userTimestamp || new Date();\n' +
        '\n' +
        '    const updated = await writing.save();\n' +
        '\n' +
        '    if (!updated) {\n' +
        "      throw new Error('Failed to update writing');\n" +
        '    }\n' +
        '\n' +
        "    return await this.writingModel.findById(id).select('-content').exec();\n" +
        '  }\n' +
        '\n' +
        '  async addWordCount(\n' +
        '    writingId: string,\n' +
        '    userId: string,\n' +
        '    latestCount: number,\n' +
        '    originalCount: number,\n' +
        '    userTimestamp?: Date,\n' +
        '  ): Promise<void> {\n' +
        '    Logger.log(\n' +
        '      `Latest count: ${latestCount}, Original count: ${originalCount}`,\n' +
        '    );\n' +
        '    const wordCount = latestCount - originalCount;\n' +
        '\n' +
        '    if (wordCount <= 0) {\n' +
        '      return;\n' +
        '    }\n' +
        '\n' +
        '    const wordCountDocument = new this.wordCountModel({\n' +
        '      writingId,\n' +
        '      userId,\n' +
        '      count: wordCount,\n' +
        '      createdAt: userTimestamp || new Date(),\n' +
        '    });\n' +
        '    await wordCountDocument.save();\n' +
        '  }\n' +
        '\n' +
        '  // Word metrics needs to return the total word count for each writing\n' +
        '  // over the course of the last two weeks\n' +
        '  async getWordMetrics(userId: string): Promise<{ [key: string]: number }> {\n' +
        '    const wordCounts = await this.wordCountModel.find({ userId }).exec();\n' +
        '\n' +
        '    const metrics: { [key: string]: number } = {};\n' +
        '\n' +
        '    for (const wordCount of wordCounts) {\n' +
        '      // Format from YYYY-MM-DD to MM-DD\n' +
        '      const dateArr = wordCount.createdAt\n' +
        '        .toISOString()\n' +
        "        .split('T')[0]\n" +
        "        .split('-');\n" +
        "      const date = dateArr[1] + '-' + dateArr[2];\n" +
        '\n' +
        '      if (!metrics[date]) {\n' +
        '        metrics[date] = 0;\n' +
        '      }\n' +
        '\n' +
        '      metrics[date] += wordCount.count;\n' +
        '    }\n' +
        '\n' +
        '    for (const date of this.buildLastTwoWeeks()) {\n' +
        '      if (!metrics[date]) {\n' +
        '        metrics[date] = 0;\n' +
        '      }\n' +
        '    }\n' +
        '\n' +
        '    return metrics;\n' +
        '  }\n' +
        '\n' +
        '  async getHeatmapMetrics(\n' +
        '    userId: string,\n' +
        '  ): Promise<{ date: string; value: number }[]> {\n' +
        '    // Get all word counts for the user for the last year\n' +
        '    const wordCounts = await this.wordCountModel\n' +
        '      .find({\n' +
        '        userId,\n' +
        '        createdAt: {\n' +
        '          $gte: new Date(new Date().setFullYear(new Date().getFullYear() - 1)),\n' +
        '        },\n' +
        '      })\n' +
        '      .exec();\n' +
        '\n' +
        '    const metrics: { [key: string]: number } = {};\n' +
        '\n' +
        '    for (const wordCount of wordCounts) {\n' +
        '      // Format to YYYY-MM-DD\n' +
        "      const date = wordCount.createdAt.toISOString().split('T')[0];\n" +
        '\n' +
        '      if (!metrics[date]) {\n' +
        '        metrics[date] = 0;\n' +
        '      }\n' +
        '\n' +
        '      metrics[date] += wordCount.count;\n' +
        '    }\n' +
        '\n' +
        '    // Build an array of objects with the date and count\n' +
        '    const heatmap = [];\n' +
        '    for (const date in metrics) {\n' +
        '      heatmap.push({ date, value: metrics[date] });\n' +
        '    }\n' +
        '\n' +
        '    return heatmap;\n' +
        '  }\n' +
        '\n' +
        '  buildLastTwoWeeks(): string[] {\n' +
        '    const today = new Date();\n' +
        '    const lastTwoWeeks = [];\n' +
        '    for (let i = 0; i < 14; i++) {\n' +
        '      const date = new Date(today);\n' +
        '      date.setDate(today.getDate() - i);\n' +
        "      const dayArr = date.toISOString().split('T')[0].split('-');\n" +
        '      lastTwoWeeks.push(`${dayArr[1]}-${dayArr[2]}`);\n' +
        '    }\n' +
        '    return lastTwoWeeks;\n' +
        '  }\n' +
        '\n' +
        '  stripHtmlTags(content: string): string {\n' +
        '    return content\n' +
        "      .replace(/<\\/?[^>]+(>|$)/g, ' ')\n" +
        "      .replace(/\\s+/g, ' ')\n" +
        '      .trim();\n' +
        '  }\n' +
        '\n' +
        '  convertFromDelta(delta: any): string {\n' +
        '    if (!delta.ops) {\n' +
        "      return '';\n" +
        '    }\n' +
        '\n' +
        "    let introExcerpt = '';\n" +
        '    for (const op of delta.ops) {\n' +
        '      if (introExcerpt.length >= 140) {\n' +
        '        break;\n' +
        '      }\n' +
        '\n' +
        '      if (op.insert) {\n' +
        '        introExcerpt += op.insert;\n' +
        '      }\n' +
        '    }\n' +
        '\n' +
        '    return introExcerpt.slice(0, 140);\n' +
        '  }\n' +
        '\n' +
        '  stripNonAlphaCharacters(content: string): string {\n' +
        "    return content.replace(/[^a-zA-Z]/g, '');\n" +
        '  }\n' +
        '}\n',
      importSources: [
        '/home/joeldemort/dev/shipwriter/backend/src/writing/writing.schema.ts',
        '/home/joeldemort/dev/shipwriter/backend/src/writing/word-count.schema.ts',
        '/home/joeldemort/dev/shipwriter/backend/src/writing/writing.types.ts'
      ],
      analysis: {
        tooManyChar: [Object],
        tooManyLines: [Object],
        tooManyDependencies: [Object],
        isUnused: false,
        circularDependencySources: []
      },
      isUnused: false,
      circularDependencySources: []
    },
    {
      path: '/home/joeldemort/dev/shipwriter/backend/src/writing/writing.types.ts',
      sourceCode: 'export type WritingInput = {\n' +
        '  title: string;\n' +
        '  content: string;\n' +
        '  wordCount: string; // Need to parse\n' +
        '  userTimestamp?: Date;\n' +
        '};\n',
      importSources: [],
      analysis: {
        tooManyChar: [Object],
        tooManyLines: [Object],
        tooManyDependencies: [Object],
        isUnused: false,
        circularDependencySources: []
      },
      isUnused: false,
      circularDependencySources: []
    }
  ]
}