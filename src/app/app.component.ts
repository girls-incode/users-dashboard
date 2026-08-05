import { Component, OnInit, inject } from '@angular/core';
import { UsersService } from './services/users.service'
import { User } from './models/user.model'
import { UserListComponent } from './components/user-list/user-list.component'

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrl: './app.component.scss',
  imports: [UserListComponent]
})
export class AppComponent implements OnInit {
  usersService = inject(UsersService)

  users: User[] = []

  ngOnInit(): void {
    this.usersService.getUsers().subscribe(users => {
      this.users = users
    })
  }
}
