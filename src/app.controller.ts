import {
  Body,
  Controller,
  Get,
  Post,
  Req,
  Res,
  UnauthorizedException,
} from '@nestjs/common';
import { Request, Response } from 'express';
import * as fs from 'fs';

type LoginFormDto = {
  username: string;
  password: string;
};

type TransferFormDto = {
  username: string;
  amount: string;
};

type User = {
  username: string;
  password: string;
  balance: number;
};

type Session = {
  sessionId: string;
  username: string;
};

class AppManager {
  static users: User[] = [
    { username: 'alex', password: '123456', balance: 300 },
    { username: 'john', password: '123456', balance: 300 },
    { username: 'katy', password: '123456', balance: 300 },
  ];
  static sessions: Session[] = [];

  static loadUserSessions() {
    console.log('Loading user sessions...');
    const data = fs.readFileSync('./sessions.json').toString();
    this.sessions = JSON.parse(data);
  }

  static createUserSession(username: string) {
    console.log(`Creating user session ${username}...`);
    const sessionId = `${new Date().getTime()}${Math.random()}`;
    const newSession: Session = {
      sessionId,
      username: username,
    };

    AppManager.sessions.push(newSession);

    fs.writeFileSync('./sessions.json', JSON.stringify(AppManager.sessions));
    return sessionId;
  }

  static removeSession(sessionId: string) {
    console.log(`Removing session with id ${sessionId}`);
    AppManager.sessions = AppManager.sessions.filter(
      (session) => session.sessionId !== sessionId,
    );
    fs.writeFileSync('./sessions.json', JSON.stringify(AppManager.sessions));
  }

  static getUserFromSessionId(sessionId: string | null) {
    console.log(`Getting user from sessionId: ${sessionId}`);
    if (!sessionId) return null;
    const session = AppManager.sessions.find(
      (session) => session.sessionId === sessionId,
    );
    if (!session) return null;

    const user = AppManager.users.find(
      (user) => user.username === session.username,
    );

    if (!user) return null;

    return user;
  }

  static getUser(username: string) {
    return AppManager.users.find((user) => user.username === username) || null;
  }
}

AppManager.loadUserSessions();

const loginPage = `
  <div style="display: flex; flex-direction: column; width: 400px;">
    <h1>Welcome to bank app</h1>
    <form style="display: flex; flex-direction: column; gap: 8px;" action="/login" method="POST">
      <input name="username" placeholder="Username" />
      <input name="password" placeholder="Password" type="password" />
      <button>Login</button>
    </form>
  </div>
`;

const homePage = `
  <div style="display: flex; flex-direction: column; width: 400px;">
    <h1>Welcome back {{username}}</h1>
    <div>Your balance is \${{balance}}</div>
    <form style="display: flex; flex-direction: column; gap: 8px;" action="/transfer" method="POST" >
      <input name="username" placeholder="Username" />
      <input name="amount" type="number" placeholder="Amount" />
      <button>Transfer</button>
    </form>

    <form action="/logout" method="POST">
      <button>Logout</button>
    </form>
  </div>
`;

@Controller()
export class AppController {
  constructor() {}

  @Get()
  home(@Req() req: Request) {
    const user = AppManager.getUserFromSessionId(req.cookies.sessionId);
    if (user)
      return homePage
        .replace('{{username}}', user.username)
        .replace('{{balance}}', user.balance.toFixed(2));

    return loginPage;
  }

  @Post('logout')
  logout(@Req() req: Request, @Res() res: Response) {
    const sessionId = req.headers.cookie.split('sessionId=')[1].split(';')[0];
    AppManager.removeSession(sessionId);

    res.cookie('sessionId', '', {
      expires: new Date(1970),
    });
    res.redirect('/');
  }

  @Post('login')
  login(@Body() loginFormDto: LoginFormDto, @Res() res: Response) {
    const user = AppManager.users.find(
      (user) =>
        user.password === loginFormDto.password &&
        user.username === loginFormDto.username,
    );
    if (!user) {
      throw new UnauthorizedException('User and Password did not match');
    }

    const sessionId = AppManager.createUserSession(user.username);

    res.cookie('sessionId', sessionId, {
      httpOnly: true,
    });

    res.redirect('/');
  }

  @Post('transfer')
  transfer(
    @Body() transferFormDto: TransferFormDto,
    @Req() req: Request,
    @Res() res: Response,
  ) {
    const amountToTransfer = parseInt(transferFormDto.amount);

    if (isNaN(amountToTransfer) || amountToTransfer <= 0) {
      throw new UnauthorizedException('Incorrect amount');
    }

    const fromUser = AppManager.getUserFromSessionId(req.cookies.sessionId);
    const toUser = AppManager.getUser(transferFormDto.username);

    if (fromUser.balance < amountToTransfer) {
      throw new UnauthorizedException('Not enough funds');
    }

    if (!toUser) {
      throw new UnauthorizedException('User not found');
    }

    fromUser.balance -= amountToTransfer;
    toUser.balance += amountToTransfer;

    res.redirect('/');
  }
}
