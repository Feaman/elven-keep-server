import BaseService from '~/services/base'
import StatusesService from '~/services/statuses'
import NotesService from './notes'
import ListItemModel, { ListItemDataObject } from '~/models/list-item'

export default class ListItemsService extends BaseService {
  static async create (data: any) {
    const activeStatus = await StatusesService.getActive()
    const note = await NotesService.findById(data.noteId)
    const listItem = new ListItemModel(data)

    listItem.statusId = data.statusId || activeStatus.id
    listItem.noteId = note.id

    return listItem.save()
  }

  static async update (listItemId: number, data: any) {
    const activeStatus = await StatusesService.getActive()
    const listItem = await this.findById(listItemId)

    listItem.text = data.text
    listItem.statusId = data.statusId || activeStatus.id
    listItem.checked = data.checked
    listItem.completed = data.completed

    return listItem.save()
  }

  static async remove (listItemId: number) {
    const listItem = await this.findById(listItemId)
    return listItem.remove()
  }

  static async findById (listItemId: number): Promise<ListItemModel> {
    const activeStatus = await StatusesService.getActive()

    return new Promise((resolve, reject) => {
      this.pool.query({
        sql: 'select * from list_items where id = ? and status_id = ?',
        values: [listItemId, activeStatus.id],
      },
      (error, listItemsData: ListItemDataObject[]) => {
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
