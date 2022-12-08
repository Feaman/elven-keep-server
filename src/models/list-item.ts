import { MysqlError, OkPacket } from "mysql"
import Validator from "validatorjs"
import BaseService from "~/services/base"
import StatusesService from "~/services/statuses"
import NoteModel from "./note"
import ListItemsService from "~/services/list-item"

export interface IListItem {
  id: number,
  note_id: number,
  text: string | '',
  checked: boolean,
  noteId: number,
  status_id: number,
  statusId: number,
  completed: boolean,
  created: string,
  order: number,
  updated: string,
}

export default class ListItemModel {
  id: number
  noteId: number
  text: string | ''
  order: number
  checked: boolean
  statusId: number
  completed: boolean
  note: NoteModel | null = null
  created: string
  updated: string

  static rules = {
    id: 'numeric',
    noteId: 'required|numeric',
    text: 'string',
    checked: 'boolean',
    statusId: 'required|numeric',
    completed: 'boolean',
  }

  constructor (data: IListItem) {
    this.id = data.id
    this.text = data.text
    this.checked = data.checked || false
    this.completed = data.completed || false
    this.statusId = data.status_id
    this.noteId = data.note_id
    this.created = data.created
    this.updated = data.updated
    this.order = data.order
  }

  validate (): boolean {
    const validation = new Validator(this, ListItemModel.rules)
    return !!validation.passes()
  }

  async save (): Promise<ListItemModel> {
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
          order: this.order,
          note_id: this.noteId,
        }
        BaseService.pool.query('insert into list_items set ?', data, async (error: MysqlError | null, result: OkPacket) => {
          if (error) {
            return reject({ message: "Sorry, SQL error :-c" })
          }

          this.id = result.insertId
          const listItem = await ListItemsService.findById(result.insertId)
          if (!listItem) {
            return reject(new Error('List item not found'))
          }
          this.updated = listItem.updated
          resolve(this)
        })
      } else {
        const queryParams = [this.statusId, this.text, this.order, this.checked, this.completed, this.id]
        BaseService.pool.query(
          'update list_items SET status_id = ?, text = ?, `order` = ?, checked = ?, completed = ? where id = ?',
          queryParams,
          async (error: MysqlError | null) => {
            if (error) {
              return reject({ message: "Sorry, SQL error :-c" })
            }
            const listItem = await ListItemsService.findById(this.id, true)
            if (!listItem) {
              return reject(new Error('List item not found'))
            }
            this.updated = listItem.updated
            resolve(this)
          }
        )
      }
    })
  }

  async remove (): Promise<ListItemModel> {
    const inactiveStatus = await StatusesService.getInActive()
    this.statusId = inactiveStatus.id
    return this.save()
  }

  async restore (): Promise<ListItemModel> {
    const activeStatus = await StatusesService.getActive()
    this.statusId = activeStatus.id
    return this.save()
  }
}
