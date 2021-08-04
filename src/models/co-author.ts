import BaseService from '~/services/base'
import StatusesService from '~/services/statuses'
import Validator from 'validatorjs'
import { MysqlError, OkPacket } from 'mysql'
import UserModel from './user'
import NoteModel from './note'

export interface INoteCoAuthor {
  id?: number,
  userId: number,
  noteId: number,
  statusId: number,
}

export interface INoteCoAuthorDB {
  id: number,
  user_id: number,
  note_id: number,
  status_id: number,
  first_name: string,
  second_name: string,
  email: string,
}

export default class NoteCoAuthorModel {
  id: number | null
  userId: number
  noteId: number
  user: UserModel | null = null
  statusId: number
  note: NoteModel | null  = null

  static rules = {
    id: 'numeric',
    userId: 'required|numeric',
    noteId: 'required|numeric',
  }

  constructor (data: INoteCoAuthor) {
    this.id = data.id || null
    this.userId = data.userId
    this.noteId = data.noteId
    this.statusId = data.statusId 
  }

  validate (): boolean {
    const validation = new Validator(this, NoteCoAuthorModel.rules)
    return !!validation.passes()
  }

  save (): Promise<NoteCoAuthorModel> {
    return new Promise((resolve, reject) => {
      if (!this.validate()) {
        return reject(new Error('Co-author validation failed'))
      }

      if (!this.id) {
        const values = {
          user_id: this.userId,
          note_id: this.noteId,
          status_id: this.statusId,
        }
        BaseService.pool.query(
          'insert into note_co_authors set ?',
          values,
          (error: MysqlError | null, result: OkPacket) => {
            if (error) {
              return reject({ message: "Sorry, SQL error :-c" })
            }

            this.id = result.insertId
            resolve(this)
          })
      } else {
        BaseService.pool.query(
          'update note_co_authors set user_id = ?, note_id = ?, status_id = ? where id = ?',
          [this.userId, this.noteId, this.statusId, this.id],
          (error: MysqlError | null) => {
            if (error) {
              return reject({ message: "Sorry, SQL error :-c" })
            }
            resolve(this)
          })
      }
    })
  }

  async remove (): Promise<NoteCoAuthorModel> {
    const inactiveStatus = await StatusesService.getInActive()
    this.statusId = inactiveStatus.id
    return this.save()
  }
}
