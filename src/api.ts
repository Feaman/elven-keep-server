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
const jwt = require('jsonwebtoken')
const app = express()
const tokenKey = '1a2b-3c4d-5e6f-7g8h'
const port = 3015

app.use(express.json()) // for parsing application/json
app.use(express.urlencoded({ extended: true })) // for parsing application/x-www-form-urlencoded
app.use(cors())
BaseService.init()

function checkAccess (request: Request, response: Response) {
  if (request.body._user) {
    return true
  }

  response
    .status(401)
    .send({ message: 'Not Authorized' })

  return false
}

app.use((request: Request, _response: Response, next: NextFunction) => {
  if (request.headers.authorization) {
    jwt.verify(
      request.headers.authorization.split(' ')[1],
      tokenKey,
      (error: Error, user: any) => {
        if (error) {
          next(error)
        } else if (user) {
          UsersService.findById(user.id)
            .then((user: UserModel) => {
              if (request.body) {
                request.body._user = user
              } else {
                request.body = { _user: user }
              }
              next()
            })
            .catch(error => {
              next(error)
            })
        } else {
          next(error)
        }
      }
    )
  } else {
    next()
  }
})

app.listen(port, async function () {
  console.log(`STARTED on port ${port}`)
})

app.get('/config', (request: Request, response: Response, next: NextFunction) => {
  try {
    if (checkAccess(request, response)) {
      Promise.all([TypesService.getList(), StatusesService.getList()])
        .then(results => {
          NotesService.getList(request.body._user)
            .then(notes => {
              response.status(200)
                .json({
                  notes,
                  types: results[0],
                  statuses: results[1],
                  user: request.body._user,
                })
            })
            .catch(error => next(error))
        })
        .catch(error => next(error))
    }
  } catch (error) {
    next(error)
  }
})

app.post('/notes', (request: Request, response: Response, next: NextFunction) => {
  try {
    if (checkAccess(request, response)) {
      NotesService.create(request.body)
        .then(note => response.send(note))
        .catch(error => next(error))
    }
  } catch (error) {
    next(error)
  }
})

app.put('/notes/:noteId', (request: Request, response: Response, next: NextFunction) => {
  try {
    if (checkAccess(request, response)) {
      NotesService.update(Number(request.params.noteId), request.body)
        .then(note => response.send(note))
        .catch(error => next(error))
    }
  } catch (error) {
    next(error)
  }
})

app.delete('/notes/:noteId', (request: Request, response: Response, next: NextFunction) => {
  try {
    if (checkAccess(request, response)) {
      NotesService.remove(Number(request.params.noteId), request.body._user)
        .then(() => response.send())
        .catch(error => next(error))
    }
  } catch (error) {
    next(error)
  }
})

app.post('/list-items', (request: Request, response: Response, next: NextFunction) => {
  try {
    if (checkAccess(request, response)) {
      ListItemsService.create(request.body)
        .then(listItem => response.send(listItem))
        .catch(error => next(error))
    }
  } catch (error) {
    next(error)
  }
})

app.put('/list-items/:listItemId', (request: Request, response: Response, next: NextFunction) => {
  try {
    if (checkAccess(request, response)) {
      ListItemsService.update(Number(request.params.listItemId), request.body)
        .then(() => response.send())
        .catch(error => next(error))
    }
  } catch (error) {
    next(error)
  }
})

app.delete('/list-items/:listItemId', (request: Request, response: Response, next: NextFunction) => {
  try {
    if (checkAccess(request, response)) {
      ListItemsService.remove(Number(request.params.listItemId), request.body._user)
        .then(() => response.send())
        .catch(error => next(error))
    }
  } catch (error) {
    next(error)
  }
})

app.post('/login', (request: Request, response: Response, next: NextFunction) => {
  try {
    UsersService.login(request.body)
      .then(user => {
        Promise.all([TypesService.getList(), StatusesService.getList()])
          .then(results => {
            NotesService.getList(user)
              .then(notes => {
                response.status(200)
                  .json({
                    notes,
                    types: results[0],
                    statuses: results[1],
                    user,
                    token: jwt.sign({ id: user.id }, tokenKey),
                  })
              })
              .catch(error => next(error))
          })
          .catch(error => next(error))
      })
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
      .then(user => {
        Promise.all([TypesService.getList(), StatusesService.getList()])
          .then(results => {
            NotesService.getList(user)
              .then(notes => {
                response.status(200)
                  .json({
                    notes,
                    types: results[0],
                    statuses: results[1],
                    user,
                    token: jwt.sign({ id: user.id }, tokenKey),
                  })
              })
              .catch(error => next(error))
          })
          .catch(error => next(error))
      })
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
