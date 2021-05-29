import ListItemModel, { ListItemDataObject } from './list-item'
import BaseService from '~/services/base'
import StatusesService from '~/services/statuses'
import { OkPacket } from 'mysql2/typings/mysql/lib/protocol/packets'
import Validator from 'validatorjs'
import UserModel from './user'

export interface NoteDataObject {
  id: number,
  title: string | '',
  text: string | '',
  type_id: number,
  status_id: number,
  is_completed_list_expanded: boolean,
  list: ListItemDataObject[],
}

export default class NoteModel {
  id: number
  title: string | ''
  text: string | ''
  list: ListItemModel[] = []
  typeId: number
  statusId: number
  isCompletedListExpanded = true

  static rules = {
    id: 'numeric',
    title: 'string',
    text: 'string',
    typeId: 'required|numeric',
    statusId: 'required|numeric',
    isCompletedListExpanded: 'boolean',
  };

  constructor (data: NoteDataObject) {
    this.id = data.id
    this.title = data.title || ''
    this.text = data.text || ''
    this.typeId = data.type_id
    this.statusId = data.status_id
    this.isCompletedListExpanded = data.is_completed_list_expanded
  }

  handleList (listItemsData: ListItemDataObject[]) {
    if (!listItemsData.length) {
      return
    }
    const listItems: ListItemModel[] = []
    listItemsData.forEach((listItemData: ListItemDataObject) => listItems.push(new ListItemModel(listItemData)))
    this.list = listItems
  }

  async fillList () {
    const activeStatus = await StatusesService.getActive()

    return new Promise((resolve, reject) => {
      BaseService.pool.query(
        `select * from list_items where note_id = ? and status_id = ${activeStatus.id}`,
        [this.id],
        (error, listItemsData: Array<any>) => {
          if (error) {
            return reject(error)
          }

          const listItems: ListItemModel[] = []
          listItemsData.forEach((listItemData: ListItemDataObject) => listItems.push(new ListItemModel(listItemData)))

          this.list = listItems
          resolve(listItems)
        }
      )
    })
  }

  validate () {
    if (!((this.list && this.list.length) || this.text || this.title)) {
      return false
    }

    const validation = new Validator(this, NoteModel.rules)
    return validation.passes()
  }

  save (user: UserModel) {
    return new Promise((resolve, reject) => {
      if (!this.validate()) {
        return reject(new Error('Note validation failed'))
      }

      if (!this.id) {
        const data = {
          title: this.title,
          text: this.text,
          type_id: this.typeId,
          status_id: this.statusId,
          user_id: user.id,
          is_completed_list_expanded: (typeof this.isCompletedListExpanded === "boolean") ? this.isCompletedListExpanded : true,
        }
        BaseService.pool.query('insert into notes set ?', data, (error, result: OkPacket) => {
          if (error) {
            return reject(error)
          }

          this.id = result.insertId
          resolve(this)
        })
      } else {
        const queryParams = [this.title, this.text, this.statusId, this.typeId, this.isCompletedListExpanded, this.id]
        BaseService.pool.query(
          'update notes set title = ?, text = ?, status_id = ?, type_id = ?, is_completed_list_expanded = ? where id = ?',
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
    return this.save(user)
  }
}
