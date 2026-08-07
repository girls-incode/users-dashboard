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

export interface Street {
  number: number
  name: string
}

export interface Coordinates {
  latitude: string
  longitude: string
}

export interface Timezone {
  offset: string
  description: string
}

export interface Location {
  street: Street
  city: string
  state: string
  country: string
  postcode: string | number
  coordinates: Coordinates
  timezone: Timezone
}

export interface Dob {
  date: string
  age: number
}

export interface Login {
  uuid: string
  username: string
  password: string
  salt: string
  md5: string
  sha1: string
  sha256: string
}

export interface UserResult {
  gender: string
  name: Name
  location: Location
  email: string
  phone: string
  dob: Dob
  picture: Picture
  nat: string
  login: Login
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
