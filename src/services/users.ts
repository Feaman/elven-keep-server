import { MysqlError } from 'mysql'
import UserModel, { IUser, IUserDB } from '~/models/user'
import BaseService from '~/services/base'

export default class UsersService extends BaseService {
  static async create (userData: IUser): Promise<UserModel> {
    const existentUser = await this.findByEmail(userData.email)
    if (existentUser) {
      throw new Error('User with such an email is already exists')
    }

    const user = new UserModel(userData)
    return user.save()
  }

  static async save (userId: number, userData: IUser): Promise<UserModel> {
    const user = await this.findById(String(userId))
    if (!user) {
      throw new Error('Wrong email or password')
    }

    return user.save()
  }

  static async login (userData: IUser): Promise<UserModel> {
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

  static async findByField (fieldName: string, fieldValue: string): Promise<UserModel | null> {
    return new Promise((resolve, reject) => {
      this.pool.query({
        sql: `select * from users where ${fieldName} = ?`,
        values: [fieldValue],
      },
      (error: MysqlError, usersDBData: IUserDB[]) => {
        if (error) {
          console.error(error)
          return reject({ message: "Sorry, SQL error :-c" })
        }

        if (!usersDBData.length) {
          return resolve(null)
        }

        const userDBData = usersDBData[0]
        const userData: IUser = {
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
