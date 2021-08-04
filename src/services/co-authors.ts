import BaseService from '~/services/base'
import { MysqlError } from 'mysql'
import { INoteCoAuthor, INoteCoAuthorDB } from '~/models/co-author'
import NoteCoAuthorModel from '~/models/co-author'
import StatusesService from './statuses'
import UserModel from '~/models/user'
import NotesService from './notes'
import UsersService from './users'

export default class NoteCoAuthorsService extends BaseService {
  static async create (noteId: string, coAuthorEmail: string, user: UserModel): Promise<NoteCoAuthorModel> {
    if (user.email.trim() === coAuthorEmail.trim()) {
      throw new Error(`This is note author's email`)
    }

    const note = await NotesService.findById(Number(noteId), user)
    if (!note) {
      throw new Error(`Note with id '${noteId}' not found`)
    }

    if (note.userId !== user.id) {
      throw new Error(`Co-author can by added only by author`)
    }

    // Check co-author
    const coAuthorUser = await UsersService.findByEmail(coAuthorEmail)
    if (!coAuthorUser) {
      throw new Error(`Co-author with email '${coAuthorEmail}' not found`)
    }

    // Check existence
    const existentCoAuthor = await this.find(Number(noteId), coAuthorUser.id)
    if (existentCoAuthor) {
      throw new Error('Co-author with such an email is already exists')
    }

    const activeStatus = await StatusesService.getActive()
    const noteCoAuthor = new NoteCoAuthorModel({ noteId: Number(noteId), userId: coAuthorUser.id, statusId: activeStatus.id })
    noteCoAuthor.user = coAuthorUser 
    await noteCoAuthor.save()
    await note.fillCoAuthors()
    await note.fillList()
    noteCoAuthor.note = note 

    return noteCoAuthor
  }

  static async delete (noteCoAuthorId: number, user: UserModel): Promise<NoteCoAuthorModel> {
    // Check note co-author
    const noteCoAuthor = await NoteCoAuthorsService.findById(noteCoAuthorId)
    if (!noteCoAuthor) {
      throw new Error(`Note co-author with id '${noteCoAuthorId}' not found`)
    }

    // Check note
    const note = await NotesService.findById(noteCoAuthor.noteId, user)
    if (!note) {
      throw new Error(`Note with id '${noteCoAuthor.noteId}' not found`)
    }

    // Check who can delete co-author
    if (!(note.userId === user.id || user.id === noteCoAuthor.userId)) {
      throw new Error('Co-author can by deleted only by author or deleting co-author')
    }

    noteCoAuthor.note = note 
    await note.fillCoAuthors()
    await note.fillList()
    await noteCoAuthor.remove()
    
    return noteCoAuthor
  }

  static async find (noteId: number, coAuthorId: number): Promise<NoteCoAuthorModel | null> {
    const activeStatus = await StatusesService.getActive()
    return new Promise((resolve, reject) => {
      this.pool.query({
        sql: `select * from note_co_authors where note_id = ? and user_id = ? and status_id = ?`,
        values: [noteId, coAuthorId, activeStatus.id],
      },
      (error: MysqlError, coAuthorsDBData: INoteCoAuthorDB[]) => {
        if (error) {
          return reject({ message: "Sorry, SQL error :-c" })
        }
        if (!coAuthorsDBData.length) {
          return resolve(null)
        }

        const noteCoAuthorDBData: INoteCoAuthorDB = coAuthorsDBData[0]
        const noteCoAuthorData: INoteCoAuthor = {
          id: noteCoAuthorDBData.id,
          noteId: noteCoAuthorDBData.note_id,
          userId: noteCoAuthorDBData.user_id,
          statusId: noteCoAuthorDBData.status_id,
        }

        resolve(new NoteCoAuthorModel(noteCoAuthorData))
      })
    })
  }

  static async findById (noteCoAuthorId: number): Promise<NoteCoAuthorModel | null> {
    const activeStatus = await StatusesService.getActive()
    return new Promise((resolve, reject) => {
      this.pool.query({
        sql: `select * from note_co_authors where id = ? and status_id = ?`,
        values: [noteCoAuthorId, activeStatus.id],
      },
      (error: MysqlError, coAuthorsDBData: INoteCoAuthorDB[]) => {
        if (error) {
          return reject({ message: "Sorry, SQL error :-c" })
        }
        if (!coAuthorsDBData.length) {
          return resolve(null)
        }

        const noteCoAuthorDBData: INoteCoAuthorDB = coAuthorsDBData[0]
        const noteCoAuthorData: INoteCoAuthor = {
          id: noteCoAuthorDBData.id,
          noteId: noteCoAuthorDBData.note_id,
          userId: noteCoAuthorDBData.user_id,
          statusId: noteCoAuthorDBData.status_id,
        }

        resolve(new NoteCoAuthorModel(noteCoAuthorData))
      })
    })
  }

  static async findByUserId (user: UserModel): Promise<NoteCoAuthorModel[] | null> {
    const activeStatus = await StatusesService.getActive()
    return new Promise((resolve, reject) => {
      this.pool.query({
        sql: `select * from note_co_authors where user_id = ? and status_id = ?`,
        values: [user.id, activeStatus.id],
      },
      (error: MysqlError, coAuthorsDBData: INoteCoAuthorDB[]) => {
        if (error) {
          return reject({ message: "Sorry, SQL error :-c" })
        }
        if (!coAuthorsDBData.length) {
          return resolve(null)
        }

        const noteCoAuthorsDBData: INoteCoAuthorDB[] = coAuthorsDBData
        const noteCoAuthors: NoteCoAuthorModel[] = []
        noteCoAuthorsDBData.forEach((noteCoAuthorDBData: INoteCoAuthorDB) => {
          noteCoAuthors.push(new NoteCoAuthorModel({
            id: noteCoAuthorDBData.id,
            noteId: noteCoAuthorDBData.note_id,
            userId: noteCoAuthorDBData.user_id,
            statusId: noteCoAuthorDBData.status_id,
          }))
        })
        resolve(noteCoAuthors)
      })
    })
  }
}
