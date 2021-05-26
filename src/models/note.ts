import TypeService from '~/services/types'
import ListItemModel, { ListItemDataObject } from './list-item'
import StatusService from '~/services/statuses'
import BaseService from '~/services/base'

export interface NoteDataObject {
  id: number,
  title: string | '',
  text: string | '',
  typeId: number,
  statusId: number,
  isCompletedListExpanded: boolean,
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

  constructor (data: NoteDataObject) {
    this.id = data.id
    this.title = data.title || ''
    this.text = data.text || ''
    this.typeId = data.typeId || TypeService.getDefault().id
    this.statusId = data.statusId || StatusService.getActive().id
    this.isCompletedListExpanded = data.isCompletedListExpanded
  }

  fillList() {
    return new Promise(resolve => {
      BaseService.pool.query(
        `SELECT * from list_items where note_id = ? and status_id = ${StatusService.getActive().id}`,
        [this.id],
        (error, listItemsData: Array<any>) => {
          if (error) {
            throw error
          }
  
          const listItems: ListItemModel[] = []
          listItemsData.forEach((listItemData: ListItemDataObject) => listItems.push(new ListItemModel(listItemData)))
  
          this.list = listItems
          resolve(listItems)
        }
      )
    })
  }
}
