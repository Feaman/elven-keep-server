import BaseService from '~/services/base'
import UserModel, { UserDataObject } from '~/models/user'

export default class UsersService extends BaseService {
  static async create (userData: UserDataObject) {
    const user = new UserModel(userData)
    return user.save()
  }

  static async login (userData: UserDataObject) {
    try {
      const user = await this.findByEmail(userData.email)
      if (UserModel.comparePassword(user.passwordHash, userData.password)) {
        return Promise.resolve(user)
      } else {
        return Promise.reject(new Error('Wrong email or password'))
      }
    } catch (error) {
      return Promise.reject(new Error('Wrong email or password'))
    }
  }

  static findByEmail (email: string): Promise<UserModel> {
    return new Promise((resolve, reject) => {
      this.pool.query({
        sql: 'select * from users where email = ?',
        values: [email],
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

        const userData = usersData.find((userData: UserDataObject) => userData.email === email)
        if (!userData) {
          return reject(new Error(`User with email '${email}' not found`))
        }

        resolve(new UserModel(userData))
      })
    })
  }
}
