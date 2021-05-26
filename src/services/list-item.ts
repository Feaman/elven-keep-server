import BaseService from '~/services/base'
import StatusesService from '~/services/statuses'
import NotesService from './notes'
import ListItemModel, { ListItemDataObject } from '~/models/list-item'

export default class ListItemsService extends BaseService {
  static async create (data: any) {
    const activeStatus = await StatusesService.getActive()

    return new Promise((resolve, reject) => {
      NotesService.findById(data.noteId)
        .then(note => {
          const listItem = new ListItemModel(data)
          listItem.statusId = data.statusId || activeStatus.id
          listItem.save()
            .then(listItem => resolve(listItem))
            .catch(error => reject(error))
        })
        .catch(error => reject(error))
    })
  }

  static update (listItemId: number, data: any) {
    return new Promise((resolve, reject) => {
      return this.findById(listItemId)
        .then(listItem => {
          listItem.text = data.text
          listItem.statusId = data.statusId
          listItem.checked = data.checked
          listItem.completed = data.completed

          listItem.save()
            .then(note => resolve(note))
            .catch(error => reject(error))
        })
        .catch(error => reject(error))
    })
  }

  static remove (noteId: number) {
    return new Promise((resolve, reject) => {
      return this.findById(noteId)
        .then(note => {
          note.remove()
            .then(() => resolve(''))
            .catch(error => reject(error))
        })
        .catch(error => reject(error))
    })
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

        const listItemData = listItemsData.find((listItemData: ListItemDataObject) => listItemData.id === listItemId)
        if (!listItemData) {
          return reject(new Error(`List item with id '${listItemId}' not found`))
        }

        resolve(new ListItemModel(listItemData))
      })
    })
  }
}
