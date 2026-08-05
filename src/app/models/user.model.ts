import { UserResult } from './api-result.model'

interface LoginInfo extends Object {
  uuid: string
  username: string
  password: string
  salt: string
  md5: string
  sha1: string
  sha256: string
}

export class User {
  firstname?: string
  lastname?: string
  email?: string
  phone?: string
  image?: string
  nat?: string
  login?: LoginInfo

  constructor(data: Partial<User> = {}) {
    Object.assign(this, data)
  }

  /**
   * Gets an image source url with a query string to prevent caching
   * Note: Do not remove the query string.
   */
  get imageSrc(): string {
    return `${this.image}?id=${this.login?.uuid}`
  }

  /**
   * Maps the api result to an array of User objects
   * @param {UserResult[]} userResults
   * @returns {User[]}
   */
  static mapFromUserResult(userResults: UserResult[]): User[] {
    return userResults.map(user => new User({
      firstname: user.name.first,
      lastname: user.name.last,
      email: user.email,
      phone: user.phone,
      image: user.picture.medium,
      nat: user.nat,
      login: user.login
    }))
  }
}
