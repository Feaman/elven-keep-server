import BaseService from '~/services/base'
import StatusesService from '~/services/statuses'
import NotesService from './notes'
import ListItemModel, { IListItem } from '~/models/list-item'
import { MysqlError } from 'mysql'
import UserModel from '~/models/user'

export default class ListItemsService extends BaseService {
  static async create (data: any, user: UserModel): Promise<ListItemModel> {
    const activeStatus = await StatusesService.getActive()
    const listItem = new ListItemModel(data)
    const note = await NotesService.findById(data.noteId, user)

    await note.fillCoAuthors()
    listItem.statusId = data.statusId || activeStatus.id
    listItem.noteId = note.id
    listItem.note = note

    return listItem.save()
  }

  static async update (listItemId: number, data: any, user: UserModel): Promise<ListItemModel> {
    const activeStatus = await StatusesService.getActive()
    const listItem = await this.findById(listItemId)
    const note = await NotesService.findById(listItem.noteId, user)
    
    await note.fillCoAuthors()
    listItem.note = note
    listItem.text = data.text
    listItem.statusId = data.statusId || activeStatus.id
    listItem.checked = data.checked
    listItem.completed = data.completed

    return listItem.save()
  }

  static async remove (listItemId: number, currentUser: UserModel): Promise<ListItemModel> {
    const listItem = await this.findById(listItemId)
    const note = await NotesService.findById(listItem.noteId, currentUser)
    if (!note) {
      throw new Error(`Note with id '${listItem.noteId}' not found`)
    }
    await note.fillCoAuthors()
    listItem.note = note
    return listItem.remove()
  }

  static async findById (listItemId: number): Promise<ListItemModel> {
    const activeStatus = await StatusesService.getActive()

    return new Promise((resolve, reject) => {
      this.pool.query({
        sql: 'select * from list_items where id = ? and status_id = ?',
        values: [listItemId, activeStatus.id],
      },
      (error: MysqlError, listItemsData: IListItem[]) => {
        if (error) {
          return reject(error)
        }

        const listItemData = listItemsData[0]
        if (!listItemData) {
          return reject(new Error(`List item with id '${listItemId}' not found`))
        }

        resolve(new ListItemModel(listItemData))
      })
    })
  }
}
