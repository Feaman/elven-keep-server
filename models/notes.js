export default class NotesService extends BaseService {
  getList () {

  const activeStatus = statuses.find((status) => status.name === STATUS_ACTIVE)
  pool.query(`SELECT * from notes where status_id = ${activeStatus.id} order by created desc`, function (error, notes) {
    if (error) return next(error)

    // Get list items
    const promises = []
    notes.forEach((note) => {
      promises.push(
        new Promise((resolve) => {
          pool.query(
            `SELECT * from list_items where note_id = ? and status_id = ${activeStatus.id}`,
            [note.id],
            function (error, listItems) {
              if (error) return next(error)
              note.list = listItems
              resolve()
            }
          )
        })
      )
    })
    Promise.all(promises).then(() => {
      response.send(notes)
    })
  })
  }
}