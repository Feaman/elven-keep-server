import ListItemModel, { IListItem } from './list-item'
import BaseService from '~/services/base'
import StatusesService from '~/services/statuses'
import { MysqlError, OkPacket } from 'mysql'
import Validator from 'validatorjs'
import UserModel, { IUser } from './user'
import NoteCoAuthorModel, { INoteCoAuthor, INoteCoAuthorDB } from './co-author'
import UsersService from '~/services/users'

export interface INote {
  id: number,
  title: string | '',
  text: string | '',
  type_id: number,
  status_id: number,
  user_id: number,
  is_completed_list_expanded: boolean,
  list: IListItem[],
  coAuthors: NoteCoAuthorModel[],
  created: string,
  updated: string,
}

export default class NoteModel {
  id: number
  title: string | ''
  text: string | ''
  list: ListItemModel[] = []
  typeId: number
  statusId: number
  userId: number
  isCompletedListExpanded = true
  coAuthors: NoteCoAuthorModel[] = []
  user: UserModel | null = null
  created: string
  updated: string

  static rules = {
    id: 'numeric',
    title: 'string',
    text: 'string',
    typeId: 'required|numeric',
    statusId: 'required|numeric',
    isCompletedListExpanded: 'boolean',
  }

  constructor (data: INote) {
    this.id = data.id
    this.title = data.title || ''
    this.text = data.text || ''
    this.typeId = data.type_id
    this.statusId = data.status_id
    this.userId = data.user_id
    this.isCompletedListExpanded = data.is_completed_list_expanded
    this.created = data.created
    this.updated = data.updated
  }

  async fillUser (): Promise<UserModel | null> {
    const user = await UsersService.findById(String(this.userId))
    if (!user) {
      throw new Error(`User with id ${this.userId} not found`)
    }

    user.passwordHash = ''
    this.user = user
    return user
  }

  handleList (listItemsData: IListItem[]): void {
    if (!listItemsData.length) {
      return
    }
    const listItems: ListItemModel[] = []
    listItemsData.forEach((listItemData: IListItem) => listItems.push(new ListItemModel(listItemData)))
    this.list = listItems
  }

  async fillList (): Promise<ListItemModel[]> {
    const activeStatus = await StatusesService.getActive()

    return new Promise((resolve, reject) => {
      BaseService.pool.query(
        `select * from list_items where note_id = ? and status_id = ${activeStatus.id}`,
        [this.id],
        (error: MysqlError | null, listItemsData: IListItem[]) => {
          if (error) {
            return reject({ message: "Sorry, SQL error :-c" })
          }

          const listItems: ListItemModel[] = []
          listItemsData.forEach((listItemData: IListItem) => listItems.push(new ListItemModel(listItemData)))

          this.list = listItems
          resolve(listItems)
        }
      )
    })
  }

  async fillCoAuthors (): Promise<NoteCoAuthorModel[]> {
    const activeStatus = await StatusesService.getActive()

    return new Promise((resolve, reject) => {
      BaseService.pool.query(
        `select
          note_co_authors.id,
          note_co_authors.note_id,
          note_co_authors.user_id,
          note_co_authors.status_id,
          users.first_name,
          users.second_name,
          users.email
        from note_co_authors
        inner join users on users.id = note_co_authors.user_id
        where note_co_authors.note_id = ? and status_id = ${activeStatus.id}`,
        [this.id],
        async (error: MysqlError | null, coAuthorsDBData: INoteCoAuthorDB[]) => {
          if (error) {
            return reject({ message: "Sorry, SQL error :-c" })
          }

          const coAuthors: NoteCoAuthorModel[] = []
          coAuthorsDBData.forEach((coAuthorDBData: INoteCoAuthorDB) => {
            const coAuthorData: INoteCoAuthor = {
              id : coAuthorDBData.id,
              noteId : coAuthorDBData.note_id,
              userId : coAuthorDBData.user_id,
              statusId: coAuthorDBData.status_id,
            }
            const userData: IUser = {
              id: coAuthorDBData.user_id,
              firstName : coAuthorDBData.first_name,
              secondName : coAuthorDBData.second_name,
              email : coAuthorDBData.email,
              password: '',
              passwordHash: '',
            }
            const noteCoAuthor = new NoteCoAuthorModel(coAuthorData)
            noteCoAuthor.user = new UserModel(userData)
            coAuthors.push(noteCoAuthor)
          })

          this.coAuthors = coAuthors
          resolve(coAuthors)
        }
      )
    })
  }

  validate (): boolean {
    const validation = new Validator(this, NoteModel.rules)
    return !!validation.passes()
  }

  save (user: UserModel, validate = true): Promise<NoteModel> {
    return new Promise((resolve, reject) => {
      if (validate && !this.validate()) {
        return reject(new Error('Note validation failed'))
      }

      if (!this.id) {
        const data = {
          title: this.title,
          text: this.text,
          type_id: this.typeId,
          status_id: this.statusId,
          user_id: user.id,
          is_completed_list_expanded: (typeof this.isCompletedListExpanded === "boolean") ? this.isCompletedListExpanded : true,
        }
        BaseService.pool.query('insert into notes set ?', data, (error: MysqlError | null, result: OkPacket) => {
          if (error) {
            return reject({ message: "Sorry, SQL error :-c" })
          }

          this.id = result.insertId
          resolve(this)
        })
      } else {
        const queryParams = [this.title, this.text, this.statusId, this.typeId, this.isCompletedListExpanded, this.id]
        BaseService.pool.query(
          'update notes set title = ?, text = ?, status_id = ?, type_id = ?, is_completed_list_expanded = ? where id = ?',
          queryParams,
          (error: MysqlError | null) => {
            if (error) {
              return reject({ message: "Sorry, SQL error :-c" })
            }
            resolve(this)
          }
        )
      }
    })
  }

  async remove (user: UserModel): Promise<NoteModel> {
    const inactiveStatus = await StatusesService.getInActive()
    this.statusId = inactiveStatus.id
    return this.save(user, false)
  }

  async restore (user: UserModel): Promise<NoteModel> {
    const activeStatus = await StatusesService.getActive()
    this.statusId = activeStatus.id
    return this.save(user, false)
  }
}
