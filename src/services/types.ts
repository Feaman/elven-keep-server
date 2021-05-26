import BaseService from "~/services/base"
import TypeModel from "~/models/type"
import { TypeDataObject } from "~/models/type"

export default class TypesService extends BaseService {
  static list: TypeModel[] = []

  static getList () {
    if (!this.list.length) {
      this.pool.query( "SELECT * from types", (error: Error, result: any) => {
        if (error) {
          throw error
        }

        result.forEach((typeData: TypeDataObject) => this.list.push(new TypeModel(typeData)))
      })
    }

    return this.list
  }

  static findByName (name: string) {
    const status = TypesService.getList().find((type: TypeModel) => type.name === name)
    if (!status) {
      throw new Error(`Type with name '${name}' not found`)
    }

    return status
  }
  
  static getDefault () {
    return this.findByName(TypeModel.TYPE_LIST)
  }
}