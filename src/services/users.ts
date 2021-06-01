import BaseService from '~/services/base'
import UserModel, { UserDataObject, UserDBObject } from '~/models/user'
import { MysqlError } from 'mysql'

export default class UsersService extends BaseService {
  static async create (userData: UserDataObject): Promise<UserModel> {
    const existentUser = await this.findByEmail(userData.email)
    if (existentUser) {
      throw new Error('User with such an email is already exists')
    }

    const user = new UserModel(userData)
    return user.save()
  }

  static async login (userData: UserDataObject): Promise<UserModel> {
    const user = await this.findByEmail(userData.email)
    if (!user) {
      throw new Error('Wrong email or password')
    }

    if (!UserModel.comparePassword(userData.password, user.passwordHash)) {
      throw new Error('Wrong email or password')
    }
    user.passwordHash = ''
    return user
  }

  static findById (id: string): Promise<UserModel | null> {
    return this.findByField('id', id)
  }

  static findByEmail (email: string): Promise<UserModel | null> {
    return this.findByField('email', email)
  }

  static findByField (fieldName: string, fieldValue: string): Promise<UserModel | null> {
    return new Promise((resolve, reject) => {
      this.pool.query({
        sql: `select * from users where ${fieldName} = ?`,
        values: [fieldValue],
      },
      (error: MysqlError, usersDBData: UserDBObject[]) => {
        if (error) {
          return reject(error)
        }

        if (!usersDBData.length) {
          return resolve(null)
        }

        const userDBData = usersDBData[0]
        const userData: UserDataObject = {
            id : userDBData.id,
            firstName : userDBData.first_name,
            secondName : userDBData.second_name,
            email : userDBData.email,
            passwordHash : userDBData.password_hash,
            password : userDBData.password,
        }

        resolve(new UserModel(userData))
      })
    })
  }
}
