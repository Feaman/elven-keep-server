import cors from 'cors'
import express, { NextFunction, Request, Response } from 'express'
import http from 'http'
import jwt from 'jsonwebtoken'
import BaseService from './services/base'
import NoteCoAuthorsService from './services/co-authors'
import ListItemsService from './services/list-item'
import NotesService from './services/notes'
import RequestService from './services/request'
import SocketIOService from './services/socket-io'
import StatusesService from './services/statuses'
import TypesService from './services/types'
import UsersService from './services/users'

const PORT = 3015
const storage = new WeakMap()

const app = express()
app.use(express.json()) // for parsing application/json
app.use(express.urlencoded({ extended: true })) // for parsing application/x-www-form-urlencoded
app.use(cors())

const server = http.createServer(app)
server.listen(PORT, async function () {
  console.log(`Application server started on port ${PORT}`)
})

BaseService.init()
SocketIOService.initConnection(server)

function checkAccess(request: Request, response: Response, next: NextFunction) {
  if (storage.get(request)) {
    return next()
  }

  return response.status(401).send({ message: 'Not Authorized' })
}

app.use(async (request: Request, _response: Response, next: NextFunction) => {
  try {
    const user = await RequestService.getUserFromRequest(request)

    if (!user) return next()

    storage.set(
      request,
      {
        id: user.id,
        firstName: user.firstName,
        secondName: user.secondName,
        email: user.email,
      }
    )
    next()
  } catch (error) {
    return next(error)
  }
})

app.get(
  '/config',
  checkAccess,
  async (request: Request, response: Response, next: NextFunction) => {
    try {
      const user = storage.get(request)
      const values = await Promise.all([TypesService.getList(), StatusesService.getList(), NotesService.getList(user)])
      const types = values[0]
      const statuses = values[1]
      const notes = values[2]
      return response.status(200).json({ notes, types, statuses, user })
    } catch (error) {
      return next(error as Error)
    }
  },
)

app.get(
  '/watch-notes',
  checkAccess,
  async (request: Request, response: Response, next: NextFunction) => {
    try {
      const user = storage.get(request)
      const notes = await NotesService.getList(user, [382, 387])
      return response.status(200).json(notes)
    } catch (error) {
      return next(error)
    }
  },
)

app.get(
  '/notes/:noteId',
  checkAccess,
  async (request: Request, response: Response, next: NextFunction) => {
    try {
      const user = storage.get(request)
      const note = await NotesService.getNoteById(Number(request.params.noteId), !!request.query.only_uncompleted, user)
      return response.status(200).json(note)
    } catch (error) {
      return next(error)
    }
  },
)

app.post(
  '/notes',
  checkAccess,
  async (request: Request, response: Response) => {
    try {
      const currentUser = storage.get(request)
      const note = await NotesService.create(request.body, currentUser)
      SocketIOService.noteAdded(request, note, currentUser)
      return response.send(note)
    } catch (error) {
      return response.status(500).send({ statusCode: 500, message: (error as Error).message })
    }
  },
)

app.put(
  '/notes/:noteId',
  checkAccess,
  async (request: Request, response: Response) => {
    try {
      const { noteId } = request.params
      const currentUser = storage.get(request)
      const note = await NotesService.update(Number(noteId), request.body, currentUser)
      SocketIOService.noteChanged(request, note, currentUser)
      response.send(note)
    } catch (error) {
      return response.status(500).send({ statusCode: 500, message: (error as Error).message })
    }
  },
)

app.delete(
  '/notes/:noteId',
  checkAccess,
  async (request: Request, response: Response) => {
    try {
      const { noteId } = request.params
      const currentUser = storage.get(request)
      const note = await NotesService.remove(Number(noteId), currentUser)
      SocketIOService.noteRemoved(request, note, currentUser)
      return response.send('Ok')
    } catch (error) {
      return response.status(500).send({ statusCode: 500, message: (error as Error).message })
    }
  },
)

app.put(
  '/notes/restore/:noteId',
  checkAccess,
  async (request: Request, response: Response) => {
    try {
      const { noteId } = request.params
      const currentUser = storage.get(request)
      const note = await NotesService.restoreById(Number(noteId), currentUser)
      SocketIOService.noteAdded(request, note, currentUser)
      return response.send('Ok')
    } catch (error) {
      return response.status(500).send({ statusCode: 500, message: (error as Error).message })
    }
  },
)

app.put(
  '/notes/complete/:noteId',
  checkAccess,
  async (request: Request, response: Response) => {
    const { noteId } = request.params
    const currentUser = storage.get(request)
    try {
      const note = await NotesService.complete(Number(noteId), currentUser)
      SocketIOService.noteCompleted(request, note, currentUser)
      return response.send(note)
    } catch (error) {
      return response.status(500).send({ statusCode: 500, message: (error as Error).message })
    }
  },
)

app.post(
  '/list-items',
  checkAccess,
  async (request: Request, response: Response) => {
    try {
      const currentUser = storage.get(request)
      if (request.body.checked === '0' || request.body.checked === 'false') {
        request.body.checked = false
      }
      if (request.body.completed === '0' || request.body.completed === 'false') {
        request.body.completed = false
      }
      const listItem = await ListItemsService.create(request.body, currentUser)
      SocketIOService.listItemAdded(request, listItem, currentUser)
      return response.send(listItem)
    } catch (error) {
      return response.status(500).send({ statusCode: 500, message: (error as Error).message })
    }
  },
)

app.put(
  '/list-items/:listItemId',
  checkAccess,
  async (request: Request, response: Response) => {
    const { listItemId } = request.params
    const currentUser = storage.get(request)
    try {
      if (request.body.checked === '0' || request.body.checked === 'false') {
        request.body.checked = false
      }
      if (request.body.completed === '0' || request.body.completed === 'false') {
        request.body.completed = false
      }
      const listItem = await ListItemsService.update(Number(listItemId), request.body, currentUser)
      SocketIOService.listItemChanged(request, listItem, currentUser)
      return response.send(listItem)
    } catch (error) {
      return response.status(500).send({ statusCode: 500, message: (error as Error).message })
    }
  },
)

app.delete(
  '/list-items/:listItemId',
  checkAccess,
  async (request: Request, response: Response) => {
    const { listItemId } = request.params
    try {
      const currentUser = storage.get(request)
      const listItem = await ListItemsService.remove(Number(listItemId), currentUser, !!request.body.completely)
      SocketIOService.listItemRemoved(request, listItem, currentUser)
      return response.send({ message: 'ok' })
    } catch (error) {
      return response.status(500).send({ statusCode: 500, message: (error as Error).message })
    }
  },
)

app.put(
  '/list-items/restore/:listItemId',
  checkAccess,
  async (request: Request, response: Response) => {
    const { listItemId } = request.params
    const currentUser = storage.get(request)
    try {
      const listItem = await ListItemsService.restoreById(Number(listItemId), currentUser)
      SocketIOService.listItemAdded(request, listItem, currentUser)
      return response.send('Ok')
    } catch (error) {
      return response.status(500).send({ statusCode: 500, message: (error as Error).message })
    }
  },
)

app.put('/notes/set-order', checkAccess, async (request, response) => {
  try {
    const currentUser = storage.get(request)
    const note = await NotesService.setNotesOrder(request.body.order, currentUser)
    return response.send({ order: request.body.order })
  }
  catch (error) {
    return response.status(400).send({ statusCode: 400, message: (error as Error).message })
  }
})

app.put('/notes/:noteId/set-order', checkAccess, async (request, response) => {
  try {
    const currentUser = storage.get(request)
    const noteId = request.params.noteId
    const note = await NotesService.setListItemsOrder(Number(request.params.noteId), request.body.order, currentUser)
    SocketIOService.setListItemsOrder(request, note, currentUser)
    return response.send({ noteId, order: request.body.order })
  }
  catch (error) {
    return response.status(400).send({ statusCode: 400, message: (error as Error).message })
  }
})

app.post(
  '/notes/:noteId/co-author',
  checkAccess,
  async (request: Request, response: Response) => {
    try {
      const currentUser = storage.get(request)
      const noteCoAuthor = await NoteCoAuthorsService.create(request.params.noteId, request.body.email, currentUser)
      if (noteCoAuthor.note) {
        SocketIOService.noteAdded(request, noteCoAuthor.note, currentUser)
      }
      return response.send(noteCoAuthor)
    } catch (error) {
      return response.status(400).send({ statusCode: 400, message: (error as Error).message })
    }
  },
)

app.delete(
  '/notes/co-author/:noteIoAuthorId',
  checkAccess,
  async (request: Request, response: Response) => {
    try {
      const currentUser = storage.get(request)
      const noteCoAuthor = await NoteCoAuthorsService.delete(Number(request.params.noteIoAuthorId), currentUser)
      if (noteCoAuthor.note) {
        SocketIOService.noteRemoved(request, noteCoAuthor.note, currentUser)
      }
      return response.send('ok')
    } catch (error) {
      return response.status(500).send({ statusCode: 500, message: (error as Error).message })
    }
  },
)

app.post(
  '/login',
  async (request: Request, response: Response) => {
    try {
      const user = await UsersService.login(request.body)
      const listTypes = await TypesService.getList()
      const listStatuses = await StatusesService.getList()
      const listNotes = await NotesService.getList(user)

      response.status(200).json({
        notes: listNotes,
        types: listTypes,
        statuses: listStatuses,
        user,
        token: jwt.sign({ id: user.id }, RequestService.TOKEN_KEY),
      })
    } catch (error) {
      return response.status(400).send({ statusCode: 400, message: (error as Error).message })
    }
  },
)

app.post(
  '/users',
  async (request: Request, response: Response) => {
    try {
      const user = await UsersService.create(request.body)
      const listTypes = await TypesService.getList()
      const listStatuses = await StatusesService.getList()
      const listNotes = await NotesService.getList(user)

      response.status(200).json({
        notes: listNotes,
        types: listTypes,
        statuses: listStatuses,
        user,
        token: jwt.sign({ id: user.id }, RequestService.TOKEN_KEY),
      })
    } catch (error) {
      return response.status(400).send({ statusCode: 400, message: (error as Error).message })
    }
  },
)

app.put(
  '/users',
  checkAccess,
  async (request: Request, response: Response) => {
    try {
      const currentUser = storage.get(request)
      await UsersService.save(currentUser.id, request.body)
      return response.send('ok')
    } catch (error) {
      return response.status(400).send({ statusCode: 400, message: (error as Error).message })
    }
  },
)
