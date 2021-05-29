import BaseService from '~/services/base'
import UserModel, { UserDataObject } from '~/models/user'

export default class UsersService extends BaseService {
  static async create (userData: UserDataObject) {
    try {
      const existentUser = await this.findByEmail(userData.email)
      if (existentUser) {
        return Promise.reject(new Error('User with such an email is already exists'))
      }
    } catch (error) {
    }
    const user = new UserModel(userData)
    return user.save()
  }

  static async login (userData: UserDataObject) {
    try {
      const user = await this.findByEmail(userData.email)
      if (UserModel.comparePassword(userData.password, user.passwordHash)) {
        user.passwordHash = ''
        return Promise.resolve(user)
      } else {
        return Promise.reject(new Error('Wrong email or password'))
      }
    } catch (error) {
      return Promise.reject(new Error('Wrong email or password'))
    }
  }

  static findById (id: string): Promise<UserModel> {
    return this.findByField('id', id)
  }

  static findByEmail (email: string): Promise<UserModel> {
    return this.findByField('email', email)
  }

  static findByField (fieldName: string, fieldValue: string): Promise<UserModel> {
    return new Promise((resolve, reject) => {
      this.pool.query({
        sql: `select * from users where ${fieldName} = ?`,
        values: [fieldValue],
      },
      (error, usersData: UserDataObject[]) => {
        if (error) {
          return reject(error)
        }

        usersData.forEach((userData: any) => {
          userData.firstName = userData.first_name
          userData.secondName = userData.second_name
          userData.passwordHash = userData.password_hash
        })

        const userData = usersData.find((userData: any) => userData[fieldName] === fieldValue)
        if (!userData) {
          return reject(new Error(`User with field ${fieldName} = ${fieldValue} not found`))
        }

        resolve(new UserModel(userData))
      })
    })
  }
}
