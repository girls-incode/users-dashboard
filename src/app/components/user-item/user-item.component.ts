import { Component, input } from '@angular/core';
import { User } from '../../models/user.model'

@Component({
  selector: 'app-user-item',
  templateUrl: './user-item.component.html',
  styleUrl: './user-item.component.scss'
})
export class UserItemComponent {
  user = input.required<User>()
  allUsers = input.required<User[]>()

  /**
   * Get the count of users with same nationality
   */
  get nationalitiesCount(): number {
    if (!this.allUsers().length) {
      return 0
    }

    return this.allUsers().reduce((acc, user) => {
      return user.nat === this.user().nat ? acc + 1 : acc
    }, 0)
  }
}
