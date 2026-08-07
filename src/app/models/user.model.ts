import { UserResult } from './api-result.model'

export interface LoginInfo {
  uuid: string
  username: string
  password: string
  salt: string
  md5: string
  sha1: string
  sha256: string
}

export interface LocationInfo {
  street?: string
  city?: string
  state?: string
  country?: string
  postcode?: string | number
}

export class User {
  id?: string
  firstname?: string
  lastname?: string
  email?: string
  phone?: string
  image?: string
  nat?: string
  gender?: string
  age?: number
  location?: LocationInfo
  login?: LoginInfo
  locationLabel: string = ''

  constructor(data: Partial<User> = {}) {
    Object.assign(this, data);
    this.id = data.id || data.login?.uuid || '';
    if (data.locationLabel !== undefined) {
      this.locationLabel = data.locationLabel;
    } else {
      this.locationLabel = User.formatLocation(data.location);
    }
  }

  static formatLocation(location?: LocationInfo): string {
    if (!location) {
      return '';
    }

    const city = location.city?.trim();
    const country = location.country?.trim();

    if (city && country) {
      return `${city}, ${country}`;
    }

    return city || country || '';
  }

  /**
   * Maps the api result to an array of User objects
   * @param {UserResult[]} userResults
   * @returns {User[]}
   */
  static mapFromUserResult(userResults: UserResult[]): User[] {
    return userResults.map(user => {
      const location: LocationInfo = {
        street: `${user.location.street.number} ${user.location.street.name}`,
        city: user.location.city,
        state: user.location.state,
        country: user.location.country,
        postcode: user.location.postcode
      };
      return new User({
        id: user.login.uuid,
        firstname: user.name.first,
        lastname: user.name.last,
        email: user.email,
        phone: user.phone,
        image: user.picture.medium,
        nat: user.nat,
        gender: user.gender,
        age: user.dob.age,
        location,
        locationLabel: User.formatLocation(location),
        login: user.login
      });
    });
  }
}
