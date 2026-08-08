import { ChangeDetectionStrategy, Component, input, model, output } from '@angular/core';
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
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class UserListToolbarComponent {
  search = model.required<string>();
  groupOptions = input.required<readonly GroupOption[]>();
  selectedGroup = input.required<GroupBy>();
  currentPage = input.required<number>();

  groupChange = output<GroupBy>();
  previousPage = output<void>();
  nextPage = output<void>();
}
