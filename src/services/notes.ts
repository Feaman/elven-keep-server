import BaseService from '~/services/base'
import StatusesService from '~/services/statuses'
import StatusModel from '~/models/status'
import NoteModel, { NoteDataObject } from '~/models/note'

export default class NotesService extends BaseService {
  static getList () {
    const activeStatus = StatusesService.findByName(StatusModel.STATUS_ACTIVE)
    const notes: NoteModel[] = []

    this.pool.query(`SELECT * from notes where status_id = ${activeStatus.id} order by created desc`, (error, notesData: NoteDataObject[]) => {
      if (error) {
        throw error
      }
      notesData.forEach((noteData: NoteDataObject) => notes.push(new NoteModel(noteData)))

      // Get list items
      notes.forEach(async (note) => {
        await note.fillList()
      })

      return notes
    })
  }
}