import BaseService from '~/services/base'
import StatusesService from '~/services/statuses'
import NoteModel, { NoteDataObject } from '~/models/note'
import TypesService from './types'

export default class NotesService extends BaseService {
  static async getList (): Promise<NoteModel[]> {
    const activeStatus = await StatusesService.getActive()

    return new Promise((resolve, reject) => {
      const notes: NoteModel[] = []

      this.pool.query(
        `select * from notes where status_id = ${activeStatus.id} order by created desc`,
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

    return note.save()
  }

  static async update (noteId: number, data: any) {
    const note = await this.findById(noteId)
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

    return note.save()
  }

  static async remove (noteId: number) {
    const note = await this.findById(noteId)
    await note.fillList()
    return note.remove()
  }

  static findById (noteId: number): Promise<NoteModel> {
    return new Promise((resolve, reject) => {
      this.pool.query({
        sql: 'select * from notes where id = ?',
        values: [noteId],
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
