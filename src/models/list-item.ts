export interface ListItemDataObject {
  id: number,
  noteId: number,
  text: string | '',
  checked: Boolean,
  completed: Boolean,
}

export default class ListItemModel {
  id: number
  text: string | ''
  checked: Boolean
  completed: Boolean

  constructor (data: ListItemDataObject) {
    this.id = data?.id
    this.text = data?.text
    this.checked = data.checked || false
    this.completed = data.completed || false
  }
}
