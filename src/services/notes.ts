import NoteCoAuthorModel from '~/models/co-author'
import ListItemModel from '~/models/list-item'
import NoteModel, { IDBNote, INote } from '~/models/note'
import UserModel from '~/models/user'
import BaseService from '~/services/base'
import StatusesService from '~/services/statuses'
import NoteCoAuthorsService from './co-authors'
import TypesService from './types'

export default class NotesService extends BaseService {
  static async getList (user: UserModel, ids: number[] = []): Promise<NoteModel[]> {
    let sql = `select * from notes where user_id = ? and status_id = ? order by created desc`
    const activeStatus = await StatusesService.getActive()

    if (ids.length) {
      sql = `select * from notes where user_id = ? and id in ("${ids.join('","')}") and status_id = ? order by created desc`
    } else {
      const noteCoAuthors = await NoteCoAuthorsService.findByUserId(user)
      if (noteCoAuthors) {
        const coAuthorsNoteIds: (number | null)[] = noteCoAuthors.map((noteCoAuthor: NoteCoAuthorModel) => noteCoAuthor.noteId)
        sql = `select * from notes where (user_id = ? or id in ("${coAuthorsNoteIds.join('","')}")) and status_id = ? order by created desc`
      }
    }

    return new Promise((resolve, reject) => {
      const notes: NoteModel[] = []

      this.pool.query(
        {
          sql,
          values: [user.id, activeStatus.id],
        },
        (error, notesData: INote[]) => {
          if (error as Error) {
            console.error(error)
            return reject({ message: "Sorry, SQL error :-c" })
          }

          notesData.forEach(async (noteDBData: INote | IDBNote) => {
            (noteDBData as INote).isCompletedListExpanded = (noteDBData as IDBNote).is_completed_list_expanded;
            (noteDBData as INote).isCountable = (noteDBData as IDBNote).is_countable;
            (noteDBData as INote).isShowCheckedCheckboxes = (noteDBData as IDBNote).is_show_checked_checkboxes
            notes.push(new NoteModel(noteDBData as INote))
          })

          const generateNotesPromises: Promise<NoteModel>[] = []
          notes.forEach(note => {
            generateNotesPromises.push(new Promise(resolve => {
              note.fillList(!!ids.length).then(() => resolve(note))
            }))
            generateNotesPromises.push(new Promise(resolve => {
              note.fillCoAuthors().then(() => resolve(note))
            }))
            generateNotesPromises.push(new Promise(resolve => {
              note.fillUser().then(() => resolve(note))
            }))
          })
          Promise.all(generateNotesPromises)
            .then(() => resolve(notes))
        }
      )
    })
  }

  static async create (data: any, user: UserModel): Promise<NoteModel> {
    const note = new NoteModel(data)

    const activeStatus = await StatusesService.getActive()
    const defaultType = await TypesService.getDefault()
    note.typeId = data.typeId || defaultType.id
    note.statusId = data.statusId || activeStatus.id
    note.userId = user.id
    note.user = user

    note.handleList(data.list)

    return note.save(user)
  }

  static async update (noteId: number, data: any, user: UserModel): Promise<NoteModel> {
    const note = await this.findById(noteId, user)
    await note.fillList()
    await note.fillCoAuthors()
    note.title = data.title
    note.text = data.text
    note.typeId = data.typeId
    note.isCompletedListExpanded = (typeof data.isCompletedListExpanded === "boolean") ? data.isCompletedListExpanded : true
    note.isCountable = data.isCountable
    note.isShowCheckedCheckboxes = data.isShowCheckedCheckboxes

    if (data.statusId) {
      note.statusId = data.statusId
    }

    if (data.typeId) {
      note.typeId = data.typeId
    }

    return note.save(user)
  }

  static async getNoteById (noteId: number, onlyUncompleted = false, user: UserModel): Promise<NoteModel> {
    const note = await this.findById(noteId, user)
    await Promise.all([note.fillList(onlyUncompleted),note.fillCoAuthors(), note.fillUser()])
    return note
  }

  static async setNotesOrder (order: number[], user: UserModel): Promise<void> {
    const notes = await this.getList(user)
    order.forEach(async (noteId: number, index: number) => {
      const note = notes.find(note => note.id === noteId)
      if (!note) {
        throw new Error('Note not found')
      }
      const newOrder = index + 1
      if (note.order !== newOrder) {
        note.order = newOrder
        await note.save(user)
      }
    })
  }

  static async complete (noteId: number, user: UserModel): Promise<NoteModel> {
    const note = await this.findById(noteId, user)
      if (note.userId !== user.id) {
        throw new Error(`Note with id ${noteId} not found`)
      }
      await note.complete()
      await note.fillList()
      return note
  }

  static async setListItemsOrder (noteId: number, order: number[], user: UserModel): Promise<NoteModel> {
    const note = await this.findById(noteId, user)
    await note.fillList()
    await note.fillCoAuthors()

    order.forEach(async (listItemId: number, index: number) => {
      const listItem = note.list.find((listItem: ListItemModel) => listItem.id === listItemId)
      if (!listItem) {
        throw new Error('List item not found')
      }
      const newOrder = index + 1
      if (listItem.order !== newOrder) {
        listItem.order = newOrder
        await listItem.save()
      }
    })

    return note
  }

  static async findAndFill(noteId: number, currentUser: UserModel, allStatuses = false): Promise<NoteModel> {
    const note = await this.findById(noteId, currentUser, allStatuses)
    if (!note) {
      throw new Error(`Note with id '${noteId}' not found`)
    }
    await note.fillList()
    await note.fillCoAuthors()

    return note
  }

  static async remove (noteId: number, currentUser: UserModel): Promise<NoteModel> {
    const note = await this.findAndFill(noteId, currentUser)
    return note.remove(currentUser)
  }

  static async restoreById (noteId: number, currentUser: UserModel): Promise<NoteModel> {
    const note = await this.findAndFill(noteId, currentUser, true)
    return note.restore(currentUser)
  }

  static async findById (noteId: number, user: UserModel, allStatuses = false): Promise<NoteModel> {
    let sql = 'select * from notes where id = ? and user_id = ?'
    const activeStatus = await StatusesService.getActive()
    const noteCoAuthors = await NoteCoAuthorsService.findByUserId(user)
    if (noteCoAuthors) {
      const coAuthorsNoteIds: (string | null)[] = noteCoAuthors.map((noteCoAuthor: NoteCoAuthorModel) => String(noteCoAuthor.noteId))
      sql = `select * from notes where (id = ? and user_id = ?) or id in ("${coAuthorsNoteIds.join('","')}")`
    }
    if (!allStatuses) {
      sql = sql +  ' and status_id = ?'
    }

    return new Promise((resolve, reject) => {
      this.pool.query(
        { sql, values: [noteId, user.id, activeStatus.id]},
        (error, notesData: INote[]) => {
          if (error) {
            console.error(error)
            return reject({ message: "Sorry, SQL error :-c" })
          }

          const noteData = notesData.find((noteData: INote) => noteData.id === noteId)
          if (!noteData) {
            return reject(new Error(`Note with id '${noteId}' not found`))
          }

          resolve(new NoteModel(noteData))
        })
    })
  }
}
