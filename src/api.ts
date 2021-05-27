import { NextFunction, Response, Request } from 'express'
import BaseService from '~/services/base'
import NotesService from '~/services/notes'
import StatusesService from './services/statuses'
import TypesService from '~/services/types'
import ListItemsService from './services/list-item'
import UsersService from './services/users'
import UserModel from './models/user'

const express = require('express')
const cors = require('cors')
const app = express()
app.use(express.json()) // for parsing application/json
app.use(express.urlencoded({ extended: true })) // for parsing application/x-www-form-urlencoded
app.use(cors())
BaseService.init()

app.listen('3015', async function () {
  console.log('STARTED')
  console.log(UserModel.hashPassword('1'))
})

app.get('/types', (_request: Request, response: Response, next: NextFunction) => {
  try {
    TypesService.getList()
      .then(types => response.send(types))
      .catch(error => next(error))
  } catch (error) {
    next(error)
  }
})

app.get('/statuses', (_request: Request, response: Response, next: NextFunction) => {
  try {
    StatusesService.getList()
      .then(statuses => response.send(statuses))
      .catch(error => next(error))
  } catch (error) {
    next(error)
  }
})

app.get('/notes', (_request: Request, response: Response, next: NextFunction) => {
  try {
    NotesService.getList()
      .then(notes => response.send(notes))
      .catch(error => next(error))
  } catch (error) {
    next(error)
  }
})

app.post('/notes', (request: Request, response: Response, next: NextFunction) => {
  try {
    NotesService.create(request.body)
      .then(note => response.send(note))
      .catch(error => next(error))
  } catch (error) {
    next(error)
  }
})

app.put('/notes/:noteId', (request: Request, response: Response, next: NextFunction) => {
  try {
    NotesService.update(Number(request.params.noteId), request.body)
      .then(note => response.send(note))
      .catch(error => next(error))
  } catch (error) {
    next(error)
  }
})

app.delete('/notes/:noteId', (request: Request, response: Response, next: NextFunction) => {
  try {
    NotesService.remove(Number(request.params.noteId))
      .then(() => response.send())
      .catch(error => next(error))
  } catch (error) {
    next(error)
  }
})

app.post('/list-items', (request: Request, response: Response, next: NextFunction) => {
  try {
    ListItemsService.create(request.body)
      .then(listItem => response.send(listItem))
      .catch(error => next(error))
  } catch (error) {
    next(error)
  }
})

app.put('/list-items/:listItemId', (request: Request, response: Response, next: NextFunction) => {
  try {
    ListItemsService.update(Number(request.params.listItemId), request.body)
      .then(() => response.send())
      .catch(error => next(error))
  } catch (error) {
    next(error)
  }
})

app.delete('/list-items/:listItemId', (request: Request, response: Response, next: NextFunction) => {
  try {
    ListItemsService.remove(Number(request.params.listItemId))
      .then(() => response.send())
      .catch(error => next(error))
  } catch (error) {
    next(error)
  }
})

app.post('/login', (request: Request, response: Response, next: NextFunction) => {
  try {
    UsersService.login(request.body)
      .then(user => response.send(user))
      .catch(error => {
        response
          .status(400)
          .send({ status: 400, message: error.message })
      })
  } catch (error) {
    response
      .status(500)
      .send({ status: 500, message: 'Something goes wrong' })
  }
})

app.post('/users', (request: Request, response: Response, next: NextFunction) => {
  try {
    UsersService.create(request.body)
      .then(user => response.send(user))
      .catch(error => {
        response
          .status(400)
          .send({ status: 400, message: error.message })
      })
  } catch (error) {
    response
      .status(500)
      .send({ status: 500, message: 'Something goes wrong' })
  }
})
