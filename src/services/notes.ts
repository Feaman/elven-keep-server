import BaseService from '~/services/base'
import StatusesService from '~/services/statuses'
import NoteModel, { NoteDataObject } from '~/models/note'
import TypesService from './types'
import UserModel from '~/models/user'

export default class NotesService extends BaseService {
  static async getList (user: UserModel): Promise<NoteModel[]> {
    const activeStatus = await StatusesService.getActive()

    return new Promise((resolve, reject) => {
      const notes: NoteModel[] = []

      this.pool.query(
        {
          sql: `select * from notes where user_id = ? and status_id = ? order by created desc`,
          values: [user.id, activeStatus.id],
        },
        (error, notesData: NoteDataObject[]) => {
          if (error) {
            return reject(error)
          }

          const generateNotesPromises: Promise<NoteModel>[] = []
          notesData.forEach(async (noteData: NoteDataObject) => {
            notes.push(new NoteModel(noteData))
          })

          notes.forEach(note => {
            generateNotesPromises.push(new Promise(resolve => {
              note.fillList()
                .then(() => {
                  resolve(note)
                })
            }))
          })
          Promise.all(generateNotesPromises)
            .then(() => resolve(notes))
        }
      )
    })
  }

  static async create (data: any) {
    const note = new NoteModel(data)

    const activeStatus = await StatusesService.getActive()
    const defaultType = await TypesService.getDefault()
    note.typeId = data.typeId || defaultType.id
    note.statusId = data.statusId || activeStatus.id

    note.handleList(data.list)

    return note.save(data._user)
  }

  static async update (noteId: number, data: any) {
    const note = await this.findById(noteId, data._user)
    await note.fillList()
    note.title = data.title
    note.text = data.text
    note.typeId = data.typeId
    note.isCompletedListExpanded = (typeof data.isCompletedListExpanded === "boolean") ? data.isCompletedListExpanded : true

    if (data.statusId) {
      note.statusId = data.statusId
    }

    if (data.typeId) {
      note.typeId = data.typeId
    }

    return note.save(data._user)
  }

  static async remove (noteId: number, user: UserModel) {
    const note = await this.findById(noteId, user)
    await note.fillList()
    return note.remove(user)
  }

  static findById (noteId: number, user: UserModel): Promise<NoteModel> {
    return new Promise((resolve, reject) => {
      this.pool.query(
        {
          sql: 'select * from notes where id = ? and user_id = ?',
          values: [noteId, user.id],
        },
        (error, notesData: NoteDataObject[]) => {
          if (error) {
            return reject(error)
          }

          const noteData = notesData.find((noteData: NoteDataObject) => noteData.id === noteId)
          if (!noteData) {
            return reject(new Error(`Note with id '${noteId}' not found`))
          }

          resolve(new NoteModel(noteData))
        })
    })
  }
}
