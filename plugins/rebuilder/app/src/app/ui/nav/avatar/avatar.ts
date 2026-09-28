import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';

/** Avatar initial used in app bars. */
@Component({
  selector: 'ar-avatar',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { '[class.lg]': "size() === 32" },
  templateUrl: './avatar.html',
  styleUrl: './avatar.scss',
})
export class ArAvatar {
  readonly name = input('');
  readonly size = input<28 | 32>(28);
  protected readonly initial = computed(() => (this.name().trim()[0] ?? '?').toUpperCase());
}
