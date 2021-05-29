import { OkPacket } from "mysql2/typings/mysql/lib/protocol/packets"
import Validator from "validatorjs"
import BaseService from "~/services/base"
import StatusesService from "~/services/statuses"
import UserModel from "./user"

export interface ListItemDataObject {
  id: number,
  note_id: number,
  text: string | '',
  checked: Boolean,
  status_id: number,
  completed: Boolean,
}

export default class ListItemModel {
  id: number
  noteId: number
  text: string | ''
  checked: Boolean
  statusId: number
  completed: Boolean

  static rules = {
    id: 'numeric',
    noteId: 'required|numeric',
    text: 'required|string',
    checked: 'boolean',
    statusId: 'required|numeric',
    completed: 'boolean',
  };

  constructor (data: ListItemDataObject) {
    this.id = data.id
    this.text = data.text
    this.checked = data.checked || false
    this.completed = data.completed || false
    this.statusId = data.status_id
    this.noteId = data.note_id
  }

  validate () {
    const validation = new Validator(this, ListItemModel.rules)
    return validation.passes()
  }

  async save () {
    return new Promise((resolve, reject) => {
      if (!this.validate()) {
        return reject(new Error('List item validation failed'))
      }

      if (!this.id) {
        const data = {
          text: this.text,
          status_id: this.statusId,
          checked: this.checked,
          completed: this.completed,
          note_id: this.noteId,
        }
        BaseService.pool.query('insert into list_items set ?', data, (error, result: OkPacket) => {
          if (error) {
            return reject(error)
          }

          this.id = result.insertId
          resolve(this)
        })
      } else {
        const queryParams = [this.statusId, this.text, this.checked, this.completed, this.id]
        BaseService.pool.query(
          'update list_items SET status_id = ?, text = ?, checked = ?, completed = ? where id = ?',
          queryParams,
          error => {
            if (error) {
              return reject(error)
            }
            resolve(this)
          }
        )
      }
    })
  }

  async remove (user: UserModel) {
    const inactiveStatus = await StatusesService.getInActive()
    this.statusId = inactiveStatus.id
    return this.save()
  }
}
