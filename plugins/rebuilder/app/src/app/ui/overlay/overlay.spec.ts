import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { AcOverlayRef, AcOverlayService } from './overlay';

@Component({ selector: 'ac-test-content', template: '<p>content</p>' })
class TestContent {}

describe('AcOverlayRef close guard', () => {
  function open(): { ref: AcOverlayRef; closed: () => boolean } {
    TestBed.configureTestingModule({ providers: [provideRouter([])] });
    const ref = TestBed.inject(AcOverlayService).open(TestContent, { title: 'Test' });
    TestBed.tick();
    let closed = false;
    ref.dialogRef = { close: () => (closed = true) };
    return { ref, closed: () => closed };
  }

  it('keeps the window open on a close by the user while the guard says no', () => {
    const { ref, closed } = open();
    let allow = false;
    ref.closeGuard.set(() => allow);
    expect(ref.dismiss()).toBe(false);
    expect(closed()).toBe(false);
    allow = true;
    expect(ref.dismiss()).toBe(true);
    expect(closed()).toBe(true);
  });

  it('close() ignores the guard', () => {
    const { ref, closed } = open();
    ref.closeGuard.set(() => false);
    ref.close();
    expect(closed()).toBe(true);
  });
});
