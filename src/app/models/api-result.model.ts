export interface Name {
  title: string,
  first: string,
  last: string
}

export interface Picture {
  medium: string
  large: string
  thumbnail: string
}

export interface UserResult {
  name: Name
  email: string
  phone: string
  picture: Picture
  nat: string
  login: {
    uuid: string
    username: string
    password: string
    salt: string
    md5: string
    sha1: string
    sha256: string
  }
}

export interface Info {
  seed: string
  results: number
  page: number
}

export interface ApiResult {
  results: UserResult[],
  info: Info
}
