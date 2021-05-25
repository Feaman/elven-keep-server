const express = require("express")
const cors = require("cors")
const app = express()
app.use(express.json()) // for parsing application/json
app.use(express.urlencoded({ extended: true })) // for parsing application/x-www-form-urlencoded
app.use(cors())

var mysql = require("mysql")
var pool = mysql.createPool({
  socketPath: "/var/lib/mysql/mysql.sock",
  user: "test",
  password: "testpassword",
  database: "test",
})

let types = []
let statuses = []
const STATUS_ACTIVE = "active"
const STATUS_INACTIVE = "inactive"

pool.query("SELECT * from types", function (error, result) {
  if (error) throw error
  types = result
})

pool.query("SELECT * from statuses", function (error, result) {
  if (error) throw error
  statuses = result
})

app.listen("3015", async function () {
  console.log("started")
})

app.get("/notes", function (_request, response, next) {
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
})

app.get("/types", function (_request, response) {
  response.send(types)
})

app.get("/statuses", function (_request, response) {
  response.send(statuses)
})

app.post("/notes", function (request, response, next) {
  if (!((Array.isArray(request.body.list) && request.body.list.length) || request.body.text)) {
    return next(new Error("There is no list or text"))
  }

  const activeStatus = statuses.find((status) => status.name === STATUS_ACTIVE)
  const queryParams = {
    title: request.body.title,
    text: request.body.text,
    status_id: activeStatus.id,
    type_id: request.body.typeId,
  }
  pool.query("INSERT INTO notes SET ?", queryParams, function (error, result) {
    if (error) return next(error)
    response.send({ id: result.insertId })
  })
})

app.put("/notes/:noteId", function (request, response, next) {
  // Find note by id
  pool.query("SELECT * from notes where id = ?", [request.params.noteId], function (error, notes) {
    if (error) return next(error)
    if (!notes.length) {
      throw new Error(`Notes with id "${request.params.noteId}" not found`)
    }

    const queryParams = [request.body.title, request.body.text, request.body.typeId, request.body.is_completed_list_expanded, notes[0].id]
    pool.query(
      "update notes SET title = ?, text = ?, type_id = ?, is_completed_list_expanded = ? where id = ?",
      queryParams,
      function (error, result) {
        if (error) return next(error)
        response.send()
      }
    )
  })
})

app.delete("/notes/:noteId", function (request, response, next) {
  // Find note by id
  pool.query("SELECT * from notes where id = ?", [request.params.noteId], function (error, notes) {
    if (error) return next(error)
    if (!notes.length) {
      next(new Error(`Notes with id "${request.params.noteId}" not found`))
    }

    const inactiveStatus = statuses.find((status) => status.name === STATUS_INACTIVE)
    pool.query(`update notes SET status_id = ${inactiveStatus.id} where id = ?`, [request.params.noteId], function (error) {
      if (error) return next(error)
      response.send()
    })
  })
})

app.post("/list-items", function (request, response, next) {
  if (!request.body.text) {
    return next(new Error("List item is empty"))
  }
  // Find note by id
  pool.query("SELECT * from notes where id = ?", [request.body.noteId], function (error, notes) {
    if (error) return next(error)
    if (!notes.length) {
      return next(new Error(`Notes with id "${request.body.noteId}" not found`))
    }
    const activeStatus = statuses.find((status) => status.name === STATUS_ACTIVE)
    const queryParams = {
      text: request.body.text,
      note_id: request.body.noteId,
      checked: request.body.checked,
      status_id: activeStatus.id,
      completed: request.body.completed,
    }
    pool.query("INSERT INTO list_items SET ?", queryParams, function (error, result) {
      if (error) return next(error)
      response.send({ id: result.insertId })
    })
  })
})

app.put("/list-items/:listItemId", function (request, response, next) {
  // Find note by id
  pool.query("SELECT * from list_items where id = ?", [request.params.listItemId], function (error, listItems) {
    if (error) return next(error)
    if (!listItems.length) {
      next(new Error(`List items with id "${request.params.listItemId}" not found`))
    }

    const activeStatus = statuses.find((status) => status.name === STATUS_ACTIVE)
    const queryParams = [request.body.text, request.body.checked, request.body.completed, listItems[0].id]
    pool.query(`update list_items SET status_id = ${activeStatus.id}, text = ?, checked = ?, completed = ? where id = ?`, queryParams, function (error) {
      if (error) return next(error)
      response.send()
    })
  })
})

app.delete("/list-items/:listItemId", function (request, response, next) {
  // Find note by id
  pool.query("SELECT * from list_items where id = ?", [request.params.listItemId], function (error, listItems) {
    if (error) return next(error)
    if (!listItems.length) {
      next(new Error(`List items with id "${request.params.listItemId}" not found`))
    }

    const inactiveStatus = statuses.find((status) => status.name === STATUS_INACTIVE)
    pool.query(
      `update list_items SET status_id = ${inactiveStatus.id} where id = ?`,
      [request.params.listItemId],
      function (error) {
        if (error) return next(error)
        response.send()
      }
    )
  })
})
