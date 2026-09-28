import { model } from '@angular/core';
import { type ControlValueAccessor } from '@angular/forms';

let uid = 0;

export const nextId = (p: string) => `${p}-${++uid}`;

export abstract class ValueAccessor<T> implements ControlValueAccessor {
  abstract readonly value: ReturnType<typeof model<T>>;
  protected onChange: (v: T) => void = () => {
    /* replaced by registerOnChange */
  };
  protected onTouched: () => void = () => {
    /* replaced by registerOnTouched */
  };
  writeValue(v: T): void {
    this.value.set(v);
  }
  registerOnChange(fn: (v: T) => void): void {
    this.onChange = fn;
  }
  registerOnTouched(fn: () => void): void {
    this.onTouched = fn;
  }
  protected emit(v: T): void {
    this.value.set(v);
    this.onChange(v);
  }
}
