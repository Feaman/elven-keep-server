import Pool from "mysql2/typings/mysql/lib/Pool"

export default class BaseService {
  static pool: Pool

  static init () {
    const mysql = require("mysql")
    this.pool = mysql.createPool({
      socketPath: "/var/lib/mysql/mysql.sock",
      user: "test",
      password: "testpassword",
      database: "test",
    })
  }
}
