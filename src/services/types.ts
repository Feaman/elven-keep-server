import BaseService from "~/services/base"
import TypeModel, { IType } from "~/models/type"

export default class TypesService extends BaseService {
  static list: TypeModel[] = []

  static getList (): Promise<TypeModel[]> {
    return new Promise((resolve, reject) => {
      if (!this.list.length) {
        this.pool.query("SELECT * from types", (error: Error, result: any) => {
          if (error) {
            return reject({ message: "Sorry, SQL error :-c" })
          }
          result.forEach((typeData: IType) => this.list.push(new TypeModel(typeData)))
          resolve(this.list)
        })
      } else {
        resolve(this.list)
      }
    })
  }

  static async findByName (name: string): Promise<TypeModel> {
    const list = await this.getList()
    const type = list.find((type: TypeModel) => type.name === name)
    if (!type) {
      throw new Error(`Type with name '${name}' not found`)
    }

    return type
  }

  static getDefault (): Promise<TypeModel> {
    return this.findByName(TypeModel.TYPE_LIST)
  }
}
