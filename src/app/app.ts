import { ChangeDetectionStrategy, Component } from '@angular/core';
import { IonApp, IonRouterOutlet } from '@ionic/angular/standalone';
import { SwUpdate } from '@angular/service-worker';
import { AuthDeepLinkService } from './core/auth/auth-deep-link.service';

@Component({
  selector: 'app-root',
  imports: [IonApp, IonRouterOutlet],
  templateUrl: './app.html',
  styleUrl: './app.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class App {
  constructor(authDeepLinkService: AuthDeepLinkService, swUpdate: SwUpdate) {
    authDeepLinkService.initialize();

    // Reload automatically once a new deployed version is ready, so users never get stuck
    // on a stale cached build (e.g. old styles) between visits.
    if (swUpdate.isEnabled) {
      swUpdate.versionUpdates.subscribe((event) => {
        if (event.type === 'VERSION_READY') {
          document.location.reload();
        }
      });
      void swUpdate.checkForUpdate();
    }
  }
}
