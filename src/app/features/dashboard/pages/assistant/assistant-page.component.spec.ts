import { TestBed } from '@angular/core/testing';
import { AssistantPageComponent } from './assistant-page.component';

describe('AssistantPageComponent', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AssistantPageComponent]
    }).compileComponents();
  });

  it('should create', () => {
    const fixture = TestBed.createComponent(AssistantPageComponent);
    expect(fixture.componentInstance).toBeTruthy();
  });
});
