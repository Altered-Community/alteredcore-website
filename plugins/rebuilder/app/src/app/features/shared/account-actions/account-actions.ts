import { Component, computed, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { AuthService } from '../../../core/auth.service';
import { ArIconButton } from '../../../ui/buttons';
import { ArIcon } from '../../../ui/icon';
import { ArAvatar } from '../../../ui/nav';

/** Right side of the expanded app bar: theme, language, account. */
@Component({
  selector: 'app-account-actions',
  imports: [ArIconButton, ArIcon, ArAvatar, RouterLink],
  templateUrl: './account-actions.html',
  styleUrl: './account-actions.scss',
})
export class AccountActions {
  protected readonly auth = inject(AuthService);
  protected readonly name = computed(() => this.auth.username() ?? '');
}
