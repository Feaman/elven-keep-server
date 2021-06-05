import { Request } from "express"
import UserModel from "~/models/user"
import jwt from 'jsonwebtoken'
import UsersService from "./users"

export default class RequestService {
  static TOKEN_KEY = '1a2b-3c4d-5e6f-7g8h'

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