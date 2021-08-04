import BaseService from "~/services/base"
import StatusModel, { IStatus } from "~/models/status"

export default class StatusesService extends BaseService {
  static list: StatusModel[] = []

  static getList (): Promise<StatusModel[]> {
    return new Promise((resolve, reject) => {
      if (this.list.length) {
        resolve(this.list)
      } else {
        this.pool.query("SELECT * from statuses", (error: Error, result: any) => {
          if (error) {
            return reject({ message: "Sorry, SQL error :-c" })
          }
          result.forEach((statusData: IStatus) => this.list.push(new StatusModel(statusData)))
          resolve(this.list)
        })
      }
    })
  }

  static async findByName (name: string) {
    const list = await this.getList()
    const status = list.find((status: StatusModel) => status.name === name)
    if (!status) {
      throw new Error(`Status with name '${name}' not found`)
    }

    return status
  }

  static getActive () {
    return this.findByName(StatusModel.STATUS_ACTIVE)
  }

  static getInActive () {
    return this.findByName(StatusModel.STATUS_INACTIVE)
  }
}
