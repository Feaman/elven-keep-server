import { Pool } from "mysql"
import { mySqlUser, mySqlUserPassword } from "../secrets"

export default class BaseService {
  static pool: Pool

  static init (): void {
    const mysql = require("mysql")
    this.pool = mysql.createPool({
      socketPath: "/var/lib/mysql/mysql.sock",
      user: mySqlUser,
      password: mySqlUserPassword,
      database: "test",
    })
  }
}
