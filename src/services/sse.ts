import { NextFunction, Request, Response } from 'express'
import ListItemModel from '~/models/list-item'
import NoteModel from '~/models/note'
import UserModel from '~/models/user'
import BaseService from './base'
import UsersService from './users'

interface SSEClientInterface {
  id: number,
  response: Response,
  request: Request,
}


export default class SSEService extends BaseService {
  static EVENT_NOTE_ADDED = 'EVENT_NOTE_ADDED'
  static EVENT_NOTE_CHANGED = 'EVENT_NOTE_CHANGED'
  static EVENT_NOTE_REMOVED = 'EVENT_NOTE_REMOVED'
  static EVENT_NOTE_ORDER_SET = 'EVENT_NOTE_ORDER_SET'
  static EVENT_LIST_ITEM_CHANGED = 'EVENT_LIST_ITEM_CHANGED'
  static EVENT_LIST_ITEM_REMOVED = 'EVENT_LIST_ITEM_REMOVED'
  static EVENT_LIST_ITEM_ADDED = 'EVENT_LIST_ITEM_ADDED'

  static SSEClients: Map<string, SSEClientInterface> = new Map()

  static keepAliveTimer: ReturnType<typeof setTimeout> | null = null

  static async eventsHandler(request: Request, response: Response, next: NextFunction): Promise<void> {
    try {
      request.socket.setTimeout(0)
      request.socket.setNoDelay(true)
      request.socket.setKeepAlive(true)
      response.status(200)
      response.setHeader('Content-Type', 'text/event-stream')
      response.setHeader('Connection', 'keep-alive')
      response.setHeader('Cache-Control', 'text/event-stream')
      response.setHeader('Cache-Control', 'no-cache')
      response.setHeader('X-Accel-Buffering', 'no')
      response.write(SSEService.serialize({ initialized: true }))

      const user = await UsersService.findById(request.params.userId)
      if (!user) {
        throw new Error(`User with id ${request.params.userId} not found`)
      }
      
      const userId = user.id
      const client: SSEClientInterface = { 
        id: userId,
        response,
        request,
      }

      console.log(`SSE connected ${userId} `)
      SSEService.SSEClients.set(`${userId}-${request.params.salt}`, client)

      SSEService.keepAliveTimer = setInterval(function(){
        const content = `data: ${new Date().toISOString()} \n\n`
        response.write(content)
      }, 10000)

      request.on('close', () => {
        console.log(`SSE disconnected ${userId} `)
        SSEService.SSEClients.delete(`${userId}-${request.params.salt}`)
        if (SSEService.keepAliveTimer) {
          clearInterval(SSEService.keepAliveTimer)
        }
      })
    } catch (error) {
      console.error(error)
      next()
    }
  }

  static noteAdded(request: Request, note: NoteModel, currentUser: UserModel): void {
    this.getNoteClients(request, note, currentUser).forEach(noteClient => {
      SSEService.send(noteClient.response, this.EVENT_NOTE_ADDED, note)
    })
  }

  static noteChanged(request: Request, note: NoteModel, currentUser: UserModel): void {
    this.getNoteClients(request, note, currentUser).forEach(noteClient => {
      SSEService.send(noteClient.response, this.EVENT_NOTE_CHANGED, note)
    })
  }

  static noteRemoved(request: Request, note: NoteModel, currentUser: UserModel): void {
    this.getNoteClients(request, note, currentUser).forEach(noteClient => {
      SSEService.send(noteClient.response, this.EVENT_NOTE_REMOVED, note)
    })
  }


  static setOrder(request: Request, note: NoteModel, currentUser: UserModel): void {
    this.getNoteClients(request, note, currentUser).forEach(noteClient => {
      SSEService.send(noteClient.response, this.EVENT_NOTE_ORDER_SET, note)
    })
  }

  static listItemAdded(request: Request, listItem: ListItemModel, currentUser: UserModel): void {
    const note = listItem.note
    if (note) {
      this.getNoteClients(request, note, currentUser).forEach(noteClient => {
        SSEService.send(noteClient.response, this.EVENT_LIST_ITEM_ADDED, listItem)
      })
    }
  }

  static listItemChanged(request: Request, listItem: ListItemModel, currentUser: UserModel): void {
    const note = listItem.note
    if (note) {
      this.getNoteClients(request, note, currentUser).forEach(noteClient => {
        SSEService.send(noteClient.response, this.EVENT_LIST_ITEM_CHANGED, listItem)
      })
    }
  }

  static listItemRemoved(request: Request, listItem: ListItemModel, currentUser: UserModel): void {
    const note = listItem.note
    if (note) {
      this.getNoteClients(request, note, currentUser).forEach(noteClient => {
        SSEService.send(noteClient.response, this.EVENT_LIST_ITEM_REMOVED, listItem)
      })
    }
  }

  static getNoteClients (request: Request, note: NoteModel, currentUser: UserModel): SSEClientInterface[] {
    const targetUserIds: number[] = []
    const clients: SSEClientInterface[] = []

    if (note) {
      targetUserIds.push(currentUser.id)

      if (currentUser.id !== note.userId) {
        targetUserIds.push(note.userId)
      }

      note.coAuthors.forEach(coAuthor => {
        if (currentUser.id !== coAuthor.userId) {
          targetUserIds.push(coAuthor.userId)
        }
      })

      targetUserIds.forEach(userId => {
        SSEService.SSEClients.forEach((client) => {
          if (
            client.id === userId &&
            client.request.params.salt !== request.headers['x-sse-salt']
          ) {
            clients.push(client)
          }
        })
      })
    }

    return clients
  }

  static send (response: Response, eventName: string, data: any): void {
    response.write(`event: ${eventName}\n`)
    response.write(SSEService.serialize(data))
  }

  static serialize (data: any): string {
    return `data: ${JSON.stringify(data)}\n\n`
  }
}