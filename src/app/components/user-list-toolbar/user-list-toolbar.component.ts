import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { GroupBy } from '../../models/grouping.model';

export interface GroupOption {
  value: GroupBy;
  label: string;
}

@Component({
  selector: 'app-user-list-toolbar',
  standalone: true,
  templateUrl: './user-list-toolbar.component.html',
  styleUrls: ['./user-list-toolbar.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ReactiveFormsModule]
})
export class UserListToolbarComponent {
  searchControl = input.required<FormControl<string>>();
  groupOptions = input.required<readonly GroupOption[]>();
  selectedGroup = input.required<GroupBy>();
  currentPage = input.required<number>();

  groupChange = output<GroupBy>();
  previousPage = output<void>();
  nextPage = output<void>();
}
