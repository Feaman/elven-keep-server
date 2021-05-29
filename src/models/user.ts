import BaseService from '~/services/base'
import { OkPacket } from 'mysql2/typings/mysql/lib/protocol/packets'
import Validator from 'validatorjs'

export interface UserDataObject {
  id: number,
  firstName: string,
  secondName: string,
  email: string,
  passwordHash: string,
  password: string,
}

export default class UserModel {
  id: number
  firstName: string
  secondName: string
  email: string
  passwordHash: string
  password: string

  static rules = {
    id: 'numeric',
    firstName: 'required|string',
    secondName: 'required|string',
    email: 'required|email',
    password: 'string',
    passwordHash: 'string',
  }

  constructor (data: UserDataObject) {
    this.id = data.id
    this.firstName = data.firstName
    this.secondName = data.secondName
    this.email = data.email
    this.passwordHash = data.passwordHash
    this.password = data.password
  }

  validate () {
    const validation = new Validator(this, UserModel.rules)
    return validation.passes()
  }

  save (): Promise<UserModel> {
    return new Promise((resolve, reject) => {
      const validation = new Validator(this, { email: UserModel.rules.email })
      if (validation.fails()) {
        return reject(new Error('Email format is so wrong'))
      }
      if (!this.validate()) {
        return reject(new Error('User validation failed'))
      }

      if (!this.id) {
        const data = {
          first_name: this.firstName,
          second_name: this.secondName,
          email: this.email,
          password_hash: UserModel.hashPassword(this.password),
        }
        BaseService.pool.query('insert into users set ?', data, (error, result: OkPacket) => {
          if (error) {
            return reject(error)
          }

          this.id = result.insertId
          resolve(this)
        })
      } else {
        const queryParams = [this.firstName, this.secondName, this.email, this.passwordHash, this.id]
        BaseService.pool.query(
          'update notes set first_name = ?, second_name = ?, email = ?, password_hash = ? where id = ?',
          queryParams,
          error => {
            if (error) {
              return reject(error)
            }
            resolve(this)
          }
        )
      }
    })
  }

  static hashPassword (password: string) {
    // const argon2 = require('argon2')

    try {
      // return await argon2.hash("password")
      return require('crypto')
        .createHash('sha256')
        .update(password)
        .digest('hex')
    } catch (err) {
      throw new Error('Password hashing error')
    }
  }

  static comparePassword (password: string, passwordHash: string) {
    // const argon2 = require('argon2')
    try {
      // return await argon2.verify(passwordHash, password);
      const requestPasswordHash = this.hashPassword(password)
      return requestPasswordHash === passwordHash
    } catch (err) {
      throw new Error('Password compare error')
    }
  }
}