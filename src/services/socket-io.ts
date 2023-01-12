import { Request } from 'express'
import http from 'http'
import { Server as SocketIOServer, Socket } from 'socket.io'
import ListItemModel from '~/models/list-item'
import NoteModel from '~/models/note'
import UserModel from '~/models/user'
import BaseService from './base'
import RequestService from './request'

interface ClientInterface {
  userId: number,
  socket: Socket
}


export default class SocketIOService extends BaseService {
  static EVENT_NOTE_ADDED = 'EVENT_NOTE_ADDED'
  static EVENT_NOTE_CHANGED = 'EVENT_NOTE_CHANGED'
  static EVENT_NOTE_REMOVED = 'EVENT_NOTE_REMOVED'
  static EVENT_NOTE_ORDER_SET = 'EVENT_NOTE_ORDER_SET'
  static EVENT_LIST_ITEM_CHANGED = 'EVENT_LIST_ITEM_CHANGED'
  static EVENT_LIST_ITEM_REMOVED = 'EVENT_LIST_ITEM_REMOVED'
  static EVENT_LIST_ITEM_ADDED = 'EVENT_LIST_ITEM_ADDED'

  static clients: Map<string, ClientInterface> = new Map()

  static keepAliveTimer: ReturnType<typeof setTimeout> | null = null

  static io: SocketIOServer

  static initConnection(server: http.Server): void {
    this.io = new SocketIOServer(server, {
      cors: {
        origin: ['http://localhost:9000', 'https://notes.pavlo.ru', 'https://new.notes.pavlo.ru'],
      }
    })

    this.io.on('connection', (socket: Socket) => {
      this.eventsHandler(socket)
    })
  }

  static async eventsHandler(socket: Socket): Promise<void> {
    try {
      const user = await RequestService.getUserFromRequest(socket.request as Request)
      if (!user) {
        throw new Error(`User not found`)
      }

      const userId = user.id
      const client: ClientInterface = {
        userId: userId,
        socket: socket,
      }

      this.clients.set(socket.id, client)

      socket.on("disconnect", () => {
        this.clients.delete(socket.id)
      })
    } catch (error) {
      console.error(error)
    }
  }

  static noteAdded(request: Request, note: NoteModel, currentUser: UserModel): void {
    this.getNoteClients(request, note, currentUser).forEach(client => {
      client.socket.emit(this.EVENT_NOTE_ADDED, note)
    })
  }

  static noteChanged(request: Request, note: NoteModel, currentUser: UserModel): void {
    this.getNoteClients(request, note, currentUser).forEach(client => {
      client.socket.emit(this.EVENT_NOTE_CHANGED, note)
    })
  }

  static noteRemoved(request: Request, note: NoteModel, currentUser: UserModel): void {
    this.getNoteClients(request, note, currentUser).forEach(client => {
      client.socket.emit(this.EVENT_NOTE_REMOVED, note)
    })
  }


  static setListItemsOrder(request: Request, note: NoteModel, currentUser: UserModel): void {
    this.getNoteClients(request, note, currentUser).forEach(client => {
      client.socket.emit(this.EVENT_NOTE_ORDER_SET, note)
    })
  }

  static listItemAdded(request: Request, listItem: ListItemModel, currentUser: UserModel): void {
    const note = listItem.note
    if (note) {
      this.getNoteClients(request, note, currentUser).forEach(client => {
        client.socket.emit(this.EVENT_LIST_ITEM_ADDED, listItem)
      })
    }
  }

  static listItemChanged(request: Request, listItem: ListItemModel, currentUser: UserModel): void {
    const note = listItem.note
    if (note) {
      this.getNoteClients(request, note, currentUser).forEach(client => {
        client.socket.emit(this.EVENT_LIST_ITEM_CHANGED, listItem)
      })
    }
  }

  static listItemRemoved(request: Request, listItem: ListItemModel, currentUser: UserModel): void {
    const note = listItem.note
    if (note) {
      this.getNoteClients(request, note, currentUser).forEach(client => {
        client.socket.emit(this.EVENT_LIST_ITEM_REMOVED, listItem)
      })
    }
  }

  static getNoteClients(request: Request, note: NoteModel, currentUser: UserModel): ClientInterface[] {
    const targetUserIds: number[] = []
    const clients: ClientInterface[] = []

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
        this.clients.forEach((client, socketId) => {
          if (
            client.userId === userId &&
            socketId !== request.headers['socket-io-id']
          ) {
            clients.push(client)
          }
        })
      })
    }

    return clients
  }
}