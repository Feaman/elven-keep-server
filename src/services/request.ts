import { Request } from "express"
import UserModel from "~/models/user"
import jwt from 'jsonwebtoken'
import UsersService from "./users"

export default class RequestService {
  static TOKEN_KEY = '34kj-l3k4-lk34-jk3j'

  static async getUserFromRequest (request: Request): Promise<UserModel | null> {
    if (request.headers.authorization){
      const payload = <{ [key: string]: any }>(
      jwt.verify(request.headers.authorization.split(' ')[1], this.TOKEN_KEY)
    )
      return await UsersService.findById(payload.id)
    }

    return null
  }
}