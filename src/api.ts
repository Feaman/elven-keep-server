import cors from 'cors'
import express, { NextFunction, Request, Response } from 'express'
import jwt from 'jsonwebtoken'
import BaseService from './services/base'
import NoteCoAuthorsService from './services/co-authors'
import ListItemsService from './services/list-item'
import NotesService from './services/notes'
import RequestService from './services/request'
import SSEService from './services/sse'
import StatusesService from './services/statuses'
import TypesService from './services/types'
import UsersService from './services/users'

const PORT = 3015

const app = express()
const storage = new WeakMap()

app.use(express.json()) // for parsing application/json
app.use(express.urlencoded({ extended: true })) // for parsing application/x-www-form-urlencoded
app.use(cors())

BaseService.init()

function checkAccess(request: Request, response: Response, next: NextFunction) {
  if (storage.get(request)) {
    return next()
  }

  return response.status(401).send({ message: 'Not Authorized' })
}

app.get('/events/:userId/:salt', SSEService.eventsHandler)

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
        showChecked: user.showChecked,
      }
    )
    next()
  } catch (error: any) {
    return next(error)
  }
})

app.listen(PORT, async function () {
  console.log(`STARTED on port ${PORT}`)
})

app.get(
  '/config',
  checkAccess,
  async (request: Request, response: Response, next: NextFunction) => {
    try {
      const user = storage.get(request)
      const types = await TypesService.getList()
      const statuses = await StatusesService.getList()
      const notes = await NotesService.getList(user)
      return response.status(200).json({ notes, types, statuses, user })
    } catch (error: any) {
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
      const note = await NotesService.getNoteById(Number(request.params.noteId), user)
      return response.status(200).json(note)
    } catch (error: any) {
      return next(error)
    }
  },
)

app.post(
  '/notes',
  checkAccess,
  async (request: Request, response: Response, next: NextFunction) => {
    try {
      const currentUser = storage.get(request)
      const note = await NotesService.create(request.body, currentUser)
      SSEService.noteAdded(request, note, currentUser)
      return response.send(note)
    } catch (error: any) {
      return response.status(500).send({statusCode: 500, message: error.message })
    }
  },
)

app.post(
  '/notes/:noteId/co-author',
  checkAccess,
  async (request: Request, response: Response) => {
    try {
      const currentUser = storage.get(request)
      const noteCoAuthor = await NoteCoAuthorsService.create(request.params.noteId, request.body.email, currentUser)
      if (noteCoAuthor.note) {
        SSEService.noteAdded(request, noteCoAuthor.note, currentUser)
      }
      return response.send(noteCoAuthor)
    } catch (error: any) {
      return response.status(400).send({statusCode: 400, message: error.message })
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
        SSEService.noteRemoved(request, noteCoAuthor.note, currentUser)
      }
      return response.send('ok')
    } catch (error: any) {
      return response.status(500).send({statusCode: 500, message: error.message })
    }
  },
)

app.put('/notes/set-order', checkAccess, async (request, response) => {
  try {
    const currentUser = storage.get(request)
    await NotesService.setNotesOrder(request.body.order, currentUser)
    return response.send({order: request.body.order})
  }
  catch (error: any) {
    return response.status(400).send({ statusCode: 400, message: error.message })
  }
})

app.put('/notes/:noteId/set-order', checkAccess, async (request, response) => {
  try {
    const currentUser = storage.get(request)
    const noteId = request.params.noteId
    const note = await NotesService.setListItemsOrder(Number(request.params.noteId), request.body.order, currentUser)
    if (note) {
      SSEService.setListItemsOrder(request, note, currentUser)
    }
    return response.send({noteId, order: request.body.order})
  }
  catch (error: any) {
    return response.status(400).send({ statusCode: 400, message: error.message })
  }
})

app.put(
  '/notes/:noteId',
  checkAccess,
  async (request: Request, response: Response, next: NextFunction) => {
    try {
      const { noteId } = request.params
      const currentUser = storage.get(request)
      const note = await NotesService.update(Number(noteId), request.body, currentUser)
      SSEService.noteChanged(request, note, currentUser)
      response.send(note)
    } catch (error: any) {
      return response.status(500).send({statusCode: 500, message: error.message })
    }
  },
)

app.put(
  '/notes/restore/:noteId',
  checkAccess,
  async (request: Request, response: Response, next: NextFunction) => {
    try {
      const { noteId } = request.params
      const currentUser = storage.get(request)
      const note = await NotesService.restoreById(Number(noteId), currentUser)
      SSEService.noteAdded(request, note, currentUser)
      return response.send('Ok')
    } catch (error: any) {
      return response.status(500).send({statusCode: 500, message: error.message })
    }
  },
)

app.delete(
  '/notes/:noteId',
  checkAccess,
  async (request: Request, response: Response, next: NextFunction) => {
    try {
      const { noteId } = request.params
      const currentUser = storage.get(request)
      const note = await NotesService.remove(Number(noteId), currentUser)
      SSEService.noteRemoved(request, note, currentUser)
      return response.send('Ok')
    } catch (error: any) {
      return response.status(500).send({statusCode: 500, message: error.message })
    }
  },
)

app.post(
  '/list-items',
  checkAccess,
  async (request: Request, response: Response, next: NextFunction) => {
    try {
      const currentUser = storage.get(request)
      const listItem = await ListItemsService.create(request.body, currentUser)
      SSEService.listItemAdded(request, listItem, currentUser)
      return response.send(listItem)
    } catch (error: any) {
      return response.status(500).send({statusCode: 500, message: error.message })
    }
  },
)

app.put(
  '/list-items/:listItemId',
  checkAccess,
  async (request: Request, response: Response, next: NextFunction) => {
    const { listItemId } = request.params
    const currentUser = storage.get(request)
    try {
      const listItem = await ListItemsService.update(Number(listItemId), request.body, currentUser)
      SSEService.listItemChanged(request, listItem, currentUser)
      return response.send(listItem)
    } catch (error: any) {
      return response.status(500).send({statusCode: 500, message: error.message })
    }
  },
)

app.put(
  '/list-items/restore/:listItemId',
  checkAccess,
  async (request: Request, response: Response, next: NextFunction) => {
    const { listItemId } = request.params
    const currentUser = storage.get(request)
    try {
      const listItem = await ListItemsService.restoreById(Number(listItemId), currentUser)
      SSEService.listItemAdded(request, listItem, currentUser)
      return response.send('Ok')
    } catch (error: any) {
      return response.status(500).send({statusCode: 500, message: error.message })
    }
  },
)

app.delete(
  '/list-items/:listItemId',
  checkAccess,
  async (request: Request, response: Response, next: NextFunction) => {
    const { listItemId } = request.params
    try {
      const currentUser = storage.get(request)
      const listItem = await ListItemsService.remove(Number(listItemId), currentUser)
      SSEService.listItemRemoved(request, listItem, currentUser)
      return response.send({ message: 'ok' })
    } catch (error: any) {
      return response.status(500).send({statusCode: 500, message: error.message })
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
    } catch (error: any) {
      return response.status(400).send({statusCode: 400, message: error.message })
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
    } catch (error: any) {
      return response.status(400).send({statusCode: 400, message: error.message })
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
    } catch (error: any) {
      return response.status(400).send({statusCode: 400, message: error.message })
    }
  },
)



