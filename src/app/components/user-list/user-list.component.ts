import { Component, input } from '@angular/core';
import { User } from '../../models/user.model'
import { UserItemComponent } from '../user-item/user-item.component'

@Component({
  selector: 'app-user-list',
  templateUrl: './user-list.component.html',
  styleUrl: './user-list.component.scss',
  imports: [
    UserItemComponent
  ]
})
export class UserListComponent {
  users = input.required<User[]>()
}
