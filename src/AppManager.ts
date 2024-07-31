import * as fs from 'fs';

type User = {
  username: string;
  password: string;
  balance: number;
};

type Session = {
  sessionId: string;
  username: string;
};

type CsrfToken = {
  token: string;
  username: string;
};

const generateRandomString = () => {
  return `${new Date().getTime()}${Math.random()}`;
};

class AppManager {
  static users: User[] = [];
  static sessions: Session[] = [];
  static csrfTokens: CsrfToken[] = [];

  static loadUserSessions() {
    console.log('Loading user sessions...');
    const data = fs.readFileSync('./sessions.json').toString();
    this.sessions = JSON.parse(data);
  }

  static createUserSession(username: string) {
    console.log(`Creating user session ${username}...`);
    const sessionId = generateRandomString();
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

  static createCsrfTokenForUsername(username: string) {
    const token = generateRandomString();
    AppManager.csrfTokens.push({
      username,
      token,
    });

    return token;
  }

  static validateCsrfTokenForUsername(username: string, token: string) {
    if (!token) {
      return false;
    }

    return !!AppManager.csrfTokens.find(
      (csrfToken) =>
        csrfToken.token === token && csrfToken.username === username,
    );
  }

  static persistsUsersData() {
    fs.writeFileSync('./users.json', JSON.stringify(AppManager.users));
  }

  static loadUsers() {
    console.log('Loading users...');
    const data = fs.readFileSync('./users.json').toString();
    this.users = JSON.parse(data);
  }
}

export default AppManager;
