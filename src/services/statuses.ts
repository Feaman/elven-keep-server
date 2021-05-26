import BaseService from "~/services/base"
import StatusModel, { StatusDataObject } from "~/models/status"

export default class StatusesService extends BaseService {
  static list: StatusModel[] = []

  static getList () {
    if (!this.list.length) {
      this.pool.query( "SELECT * from statuses", (error: Error, result: any) => {
        if (error) {
          throw error
        }
        result.forEach((statusData: StatusDataObject) => this.list.push(new StatusModel(statusData)))
      })
    }

    return this.list
  }

  static findByName (name: string) {
    const status = StatusesService.getList().find((status: StatusModel) => status.name === name)
    if (!status) {
      throw new Error(`Status with name '${name}' not found`)
    }

    return status
  }
  
  static getActive () {
    return this.findByName(StatusModel.STATUS_INACTIVE)
  }
}