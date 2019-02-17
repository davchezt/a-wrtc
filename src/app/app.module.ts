import { BrowserModule } from '@angular/platform-browser';
import { ErrorHandler, NgModule } from '@angular/core';
import { IonicApp, IonicErrorHandler, IonicModule } from 'ionic-angular';
import { SplashScreen } from '@ionic-native/splash-screen';
import { StatusBar } from '@ionic-native/status-bar';

import { MyApp } from './app.component';
import { HomePage } from '../pages/home/home';

// NATIVES
import { AndroidPermissions } from '@ionic-native/android-permissions';
import { Camera } from '@ionic-native/camera';

import { SocketIoModule, SocketIoConfig } from 'ng-socket-io';
import { HelpersProvider } from '../providers/helpers/helpers';
const config: SocketIoConfig = { url: 'http://192.168.1.200:8080', options: {} };

@NgModule({
  declarations: [
    MyApp,
    HomePage
  ],
  imports: [
    BrowserModule,
    IonicModule.forRoot(MyApp, {
      mode: 'ios', // ios md or wp
      backButtonText: ' '
    }),
    SocketIoModule.forRoot(config)
  ],
  bootstrap: [IonicApp],
  entryComponents: [
    MyApp,
    HomePage
  ],
  providers: [
    StatusBar,
    SplashScreen,
    AndroidPermissions,
    Camera,
    {provide: ErrorHandler, useClass: IonicErrorHandler},
    HelpersProvider
  ]
})
export class AppModule {}
