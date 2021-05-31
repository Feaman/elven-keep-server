import cors from 'cors';
import express, { NextFunction, Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import BaseService from './services/base';
import NoteCoAuthorsService from './services/co-authors';
import ListItemsService from './services/list-item';
import NotesService from './services/notes';
import StatusesService from './services/statuses';
import TypesService from './services/types';
import UsersService from './services/users';

const TOKEN_KEY = '1a2b-3c4d-5e6f-7g8h';
const PORT = 3015;

const app = express();
const storage = new WeakMap();

app.use(express.json()); // for parsing application/json
app.use(express.urlencoded({ extended: true })); // for parsing application/x-www-form-urlencoded
app.use(cors());
BaseService.init();

function checkAccess(request: Request, response: Response, next: NextFunction) {
  if (storage.get(request)) {
    return next();
  }

  return response.status(401).send({ message: 'Not Authorized' });
}

app.use(async (request: Request, _response: Response, next: NextFunction) => {
  try {
    if (!request.headers.authorization) return next();

    const payload = <{ [key: string]: any }>(
      jwt.verify(request.headers.authorization.split(' ')[1], TOKEN_KEY)
    );
    const user = await UsersService.findById(payload.id);
    if (user) {
      storage.set(
        request, 
        {
          id: user.id,
          firstName: user.firstName,
          secondName: user.secondName,
          email: user.email,
        }
        );
    }
    next()

  } catch (error) {
    return next(error);
  }
});

app.listen(PORT, async function () {
  console.log(`STARTED on port ${PORT}`);
});

app.get(
  '/config',
  checkAccess,
  async (request: Request, response: Response, next: NextFunction) => {
    try {
      const user = storage.get(request);
      const listTypes = await TypesService.getList();
      const listStatuses = await StatusesService.getList();
      const listNotes = await NotesService.getList(user);

      return response.status(200).json({
        notes: listNotes,
        types: listTypes,
        statuses: listStatuses,
        user,
      });
    } catch (error) {
      return next(error);
    }
  },
);

app.post(
  '/notes',
  checkAccess,
  async (request: Request, response: Response, next: NextFunction) => {
    try {
      const note = await NotesService.create(request.body, storage.get(request));
      return response.send(note);
    } catch (error) {
      return next(error);
    }
  },
);

app.post(
  '/notes/:noteId/co-author',
  checkAccess,
  async (request: Request, response: Response) => {
    try {
      const coAuthor = await NoteCoAuthorsService.create(request.params.noteId, request.body.email, storage.get(request));
      return response.send(coAuthor);
    } catch (error) {
      return response.status(400).send({statusCode: 400, message: error.message });
    }
  },
);

app.delete(
  '/notes/co-author/:noteIoAuthorId',
  checkAccess,
  async (request: Request, response: Response) => {
    try {
      const coAuthor = await NoteCoAuthorsService.delete(Number(request.params.noteIoAuthorId), storage.get(request));
      return response.send(coAuthor);
    } catch (error) {
      return response.status(400).send({statusCode: 400, message: error.message });
    }
  },
);

app.put(
  '/notes/:noteId',
  checkAccess,
  async (request: Request, response: Response, next: NextFunction) => {
    try {
      const { noteId } = request.params;
      const note = await NotesService.update(Number(noteId), request.body, storage.get(request));
      response.send(note);
    } catch (error) {
      return next(error);
    }
  },
);

app.delete(
  '/notes/:noteId',
  checkAccess,
  async (request: Request, response: Response, next: NextFunction) => {
    try {
      const { noteId } = request.params;
      const user = storage.get(request);
      await NotesService.remove(Number(noteId), user);
      return response.send('Ok');
    } catch (error) {
      next(error);
    }
  },
);

app.post(
  '/list-items',
  checkAccess,
  async (request: Request, response: Response, next: NextFunction) => {
    try {
      const user = storage.get(request);
      const listItem = await ListItemsService.create(request.body, user);
      return response.send(listItem);
    } catch (error) {
      next(error);
    }
  },
);

app.put(
  '/list-items/:listItemId',
  checkAccess,
  async (request: Request, response: Response, next: NextFunction) => {
    const { listItemId } = request.params;
    const user = storage.get(request);
    try {
      const listItem = await ListItemsService.update(Number(listItemId), request.body, user);
      return response.send(listItem);
    } catch (error) {
      next(error);
    }
  },
);

app.delete(
  '/list-items/:listItemId',
  checkAccess,
  async (request: Request, response: Response, next: NextFunction) => {
    const { listItemId } = request.params;
    try {
      await ListItemsService.remove(Number(listItemId));
      return response.send('Ok');
    } catch (error) {
      next(error);
    }
  },
);

app.post(
  '/login',
  async (request: Request, response: Response, next: NextFunction) => {
    try {
      const user = await UsersService.login(request.body);
      const listTypes = await TypesService.getList();
      const listStatuses = await StatusesService.getList();
      const listNotes = await NotesService.getList(user);

      response.status(200).json({
        notes: listNotes,
        types: listTypes,
        statuses: listStatuses,
        user,
        token: jwt.sign({ id: user.id }, TOKEN_KEY),
      });
    } catch (error) {
      return next(error);
    }
  },
);

app.post(
  '/users',
  async (request: Request, response: Response, next: NextFunction) => {
    try {
      const user = await UsersService.create(request.body);
      const listTypes = await TypesService.getList();
      const listStatuses = await StatusesService.getList();
      const listNotes = await NotesService.getList(user);

      response.status(200).json({
        notes: listNotes,
        types: listTypes,
        statuses: listStatuses,
        user,
        token: jwt.sign({ id: user.id }, TOKEN_KEY),
      });
    } catch (error) {
      return next(error);
    }
  },
);
