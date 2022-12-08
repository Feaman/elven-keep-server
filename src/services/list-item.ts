import BaseService from '~/services/base'
import StatusesService from '~/services/statuses'
import NotesService from './notes'
import ListItemModel, { IListItem } from '~/models/list-item'
import { MysqlError } from 'mysql'
import UserModel from '~/models/user'

export default class ListItemsService extends BaseService {
  static async create (data: IListItem, user: UserModel): Promise<ListItemModel> {
    const activeStatus = await StatusesService.getActive()
    const listItem = new ListItemModel(data)
    const note = await NotesService.findById(data.noteId, user)

    await note.fillCoAuthors()
    listItem.statusId = data.statusId || activeStatus.id
    listItem.noteId = note.id
    listItem.note = note

    return listItem.save()
  }

  static async update (listItemId: number, data: IListItem, user: UserModel, deleted = false): Promise<ListItemModel> {
    const activeStatus = await StatusesService.getActive()
    const listItem = await this.findById(listItemId, deleted)
    if (!listItem) {
      throw new Error(`List item with id '${listItemId}' not found`)
    }
    const note = await NotesService.findById(listItem.noteId, user)
    
    await note.fillCoAuthors()
    listItem.note = note
    listItem.text = data.text
    listItem.statusId = data.statusId || activeStatus.id
    listItem.checked = data.checked
    listItem.order = data.order 
    listItem.completed = data.completed

    return listItem.save()
  }

  static async remove (listItemId: number, currentUser: UserModel): Promise<ListItemModel> {
    const listItem = await this.findById(listItemId)
    if (!listItem) {
      throw new Error(`List item with id '${listItemId}' not found`)
    }
    const note = await NotesService.findById(listItem.noteId, currentUser)
    if (!note) {
      throw new Error(`Note with id '${listItem.noteId}' not found`)
    }
    await note.fillCoAuthors()
    listItem.note = note

    return listItem.remove()
  }

  static async restoreById (listItemId: number, currentUser: UserModel): Promise<ListItemModel> {
    const listItem = await this.findById(listItemId, true)
    if (!listItem) {
      throw new Error(`List item with id '${listItemId}' not found`)
    }
    const note = await NotesService.findById(listItem.noteId, currentUser)
    if (!note) {
      throw new Error(`Note with id '${listItem.noteId}' not found`)
    }
    await note.fillCoAuthors()
    listItem.note = note

    return listItem.restore()
  }

  static async findById (listItemId: number, allStatuses = false): Promise<ListItemModel | null> {
    const activeStatus = await StatusesService.getActive()
    let sql = 'select * from list_items where id = ? and status_id = ?' 
    if (allStatuses) {
      sql = 'select * from list_items where id = ?'
    }

    return new Promise((resolve, reject) => {
      this.pool.query({
        sql,
        values: [listItemId, activeStatus.id],
      },
      (error: MysqlError, listItemsData: IListItem[]) => {
        if (error) {
          return reject({ message: "Sorry, SQL error :-c" })
        }

        const listItemData = listItemsData[0]
        if (!listItemData) {
          return resolve(null)
        }

        resolve(new ListItemModel(listItemData))
      })
    })
  }
}
