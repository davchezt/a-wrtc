import { Component, ViewChild } from '@angular/core';
import { NavController, Platform, LoadingController, ToastController, AlertController } from 'ionic-angular';
import { AndroidPermissions } from '@ionic-native/android-permissions';

import { Socket } from 'ng-socket-io';
// import { LocalNotifications } from '@ionic-native/local-notifications';
import { HelpersProvider } from '../../providers/helpers/helpers';
import { Observable } from 'rxjs/Observable';
import 'rxjs/add/observable/fromEvent';

// declare var cordova;
declare var SimplePeer: any;

@Component({
  selector: 'page-home',
  templateUrl: 'home.html'
})

export class HomePage {
  @ViewChild('remoteVideo') remoteVideo;
  @ViewChild('localVideo') localVideo;
  @ViewChild('bottomBar') bottomBar;
  @ViewChild('chatContainer') chatContainer;
  @ViewChild("messageInput") messageInput;

  // Camera
  devicesId:any = [];
  canSwitchCamera:boolean = false;
  cameraIndex: number = 0;
  isMuted: boolean =false;
  cameraStream: any;
  remoteStream: any;

  // Call
  isCalling:boolean = false;
  isIncommingCall:boolean = false;
  isInitiator:boolean = false;
  outAudio:any = null;
  inAudio:any = null;
  timeoutCall:any = null;

  // Peer
  isStreming:boolean = false;
  isInit:boolean = false;
  userPeer: any;
  targetPeer: any;
  Peer:any = null;

  // Trimer
  timeOut: any;
  timeInterval: any;
  timeCounter: any;
  timeClock: any;
  h:number = 0;
  m:number = 0;
  s:number = 0

  // Common
  heartShow: boolean = false;
  sendingHeart: boolean = false;
  thumbShow: boolean = false;
  sendingThumb:boolean = false;
  loaderCtrl: any;

  // Socket
  roomId:string = 'video-call';
  onStartCall: any;
  onInCall: any;
  onChatCall: any;
  onStopCall: any;
  messageChat: any = [];
  chatMessage:string = '';

  constructor(
    public navCtrl: NavController,
    public socket: Socket, 
    private androidPermissions: AndroidPermissions,
    private platform: Platform,
    // private localNotifications: LocalNotifications,
    private helper: HelpersProvider,
    public loadingCtrl: LoadingController,
    private toastCtrl: ToastController,
    private alrtCtrl: AlertController
  ) {
    Observable.fromEvent(window, 'beforeunload').subscribe(event => {
      if (this.isCalling) this.endCall();
    });
    this.subscribeSocket();
    this.timeNow();
    if (platform.is("cordova")) {
      window.addEventListener("native.keyboardshow", e => {
        this.bottomBar.nativeElement.style.bottom = (<any>e).keyboardHeight + "px";
      });

      window.addEventListener("native.keyboardhide", () => {
        this.bottomBar.nativeElement.style.bottom = "0";
      });
    }
  }

  ionViewDidLoad() {
    this.platform.ready().then(() => {
      this.registerDevices();
      if (this.platform.is('cordova')) {
        this.checkPermissions();
      }
    });
  }
  ionViewWillUnload() {
    this.unregisterDevice();
    this.unsubscribeSocket();
  }

  openUserMedia = () => {
    // this.closeUserMedia();
    const constraints = {
      video: { deviceId: this.devicesId[this.cameraIndex] ? { exact: this.devicesId[this.cameraIndex] } : undefined },
      audio: true
    };
    const handleSuccess = (stream: MediaStream) => {
      this.cameraStream = stream;
      this.localVideo.nativeElement.srcObject = this.cameraStream;
      this.localVideo.nativeElement.muted = true;
      // this.localVideo.nativeElement.onclick = (e) => this.localVideo.nativeElement.webkitRequestFullscreen();
      this.localVideo.nativeElement.onloadedmetadata = (e) => {
        if (this.isInitiator) {
          this.isCalling = true;
          this.startOutAudio();
          this.openPeer();
        }
        else {
          this.isStreming = true;
          this.openPeer();
          this.Peer.signal(JSON.parse(this.targetPeer));
        }
        this.localVideo.nativeElement.play();
      }
    };
    const handleError = (error: any) => {
      console.log('navigator.getUserMedia error: ' + error.name + ', ' + error.message);
    };
    navigator.mediaDevices.getUserMedia(constraints).then(handleSuccess).catch(handleError);
  }

  newUserMedia = () => {
    this.canSwitchCamera = false;
    this.showLoading();
    let camera:string = this.cameraIndex === 0 ? 'depan':'belakang';

    const constraints = {
      video: { deviceId: this.devicesId[this.cameraIndex] ? { exact: this.devicesId[this.cameraIndex] } : undefined },
      audio: true
    };
    const handleSuccess = (stream: MediaStream) => {
      if (this.Peer && !this.Peer.destroyed) {
        this.Peer.addStream(stream);
      }
      this.cameraStream = stream;
      this.localVideo.nativeElement.pause();
      this.localVideo.nativeElement.srcObject = this.cameraStream;
      this.localVideo.nativeElement.muted = true;
      // this.localVideo.nativeElement.onclick = (e) => this.localVideo.nativeElement.webkitRequestFullscreen();
      this.localVideo.nativeElement.onloadedmetadata = (e) => {   
        this.canSwitchCamera = true;
        this.localVideo.nativeElement.play();
        this.hideLoading();
      }
    };
    const handleError = async (error: any) => {
      this.canSwitchCamera = true;
      this.hideLoading();
      console.log('navigator.getUserMedia error: ' + error.name + ', ' + error.message);
    };

    if (this.isCalling || this.isStreming) {
      this.cameraStream.getVideoTracks().forEach(track => {
        track.stop();
      });
      this.cameraStream.getAudioTracks().forEach(track => {
        track.stop();
      });
      navigator.mediaDevices.getUserMedia(constraints).then(handleSuccess).catch(handleError);
    }
    else {
      this.canSwitchCamera = true;
      this.hideLoading();
      this.showToast('beralih ke kamera ' + camera);
    }
  }

  closeUserMedia = async () => {
    if (this.cameraStream) {
      await this.cameraStream.getVideoTracks().forEach((track) => {
        track.stop();
      });
      await this.cameraStream.getAudioTracks().forEach((track) => {
        track.stop();
      });
      // this.localVideo.nativeElement.pause();
      // this.localVideo.nativeElement.currentTime = 0;
      this.localVideo.nativeElement.srcObject = null;
    }
  }

  async startCall() {
    await this.openUserMedia();
    // this.openPeer();
    // this.isCalling = true;
    // this.timeoutCall = setTimeout(() => {
    //   this.cancelCall();
    // }, 20000);
  }

  async cancelCall() {
    await this.endCall();
    this.isCalling = false;
    let confirmAlert = this.alrtCtrl.create({
      title: "Tidak ada respon",
      message: "Tekan oke untuk mengulangi panggilan.",
      buttons: [{
        text: 'Tutup',
        role: 'cancel'
      }, {
        text: 'Ok',
        handler: () => {
          this.startCall();
        }
      }]
    });
    confirmAlert.present();
  }

  async rejectedCall() {
    await this.endCall();
    this.isCalling = false;
    let confirmAlert = this.alrtCtrl.create({
      title: "Panggilan anda ditolak",
      message: "Tekan oke untuk mencoba lagi.",
      buttons: [{
        text: 'Tutup',
        role: 'cancel'
      }, {
        text: 'Ok',
        handler: () => {
          this.startCall();
        }
      }]
    });
    confirmAlert.present();
  }

  async endCall() {
    await this.stopOutAudio();
    await this.closeUserMedia();
    await this.closePeer();
    this.isCalling = false;
    this.thumbShow = false;
    this.heartShow = false;
    this.messageChat = [];
    // clearTimeout(this.timeoutCall);
  }

  async incommingCall() {
    this.startInAudio();
    this.isIncommingCall = true;
    // console.log(this.targetPeer);
  }

  async incommingCallEnded() {
    this.stopInAudio();
    this.isIncommingCall = false;
  }

  async acceptCall() {
    // console.log('call accepted');
    // if (this.Peer) return;
    await this.openUserMedia();
  }

  async rejectCall() {
    this.socket.emit('reject-call', { room: this.roomId });
  }

  async inCallStart() {
    this.startTimer();
  }

  async inCallEnd() {
    this.stropTimer();
  }

  // AUDIO
  startInAudio = () => {
    // this.inAudio = new Audio('assets/audio/incoming.wav'); 
    // this.inAudio.onended = function() {
    //   this.currentTime = 0;
    //   this.play();
    // }
    // this.inAudio.play();
  }
  stopInAudio = () => {
    // this.inAudio.pause();
    // this.inAudio.currentTime = 0;
    // this.inAudio.onended = null;
  }

  startOutAudio = () => {
    // this.outAudio = new Audio('assets/audio/outgoing.wav'); 
    // this.outAudio.onended = function() {
    //   this.currentTime = 0;
    //   (<any>window).timeoutCall = setTimeout(() => {
    //     this.play();
    //   }, 1000);
    // }
    // this.outAudio.play();
  }
  stopOutAudio = () => {
    // this.outAudio.pause();
    // this.outAudio.currentTime = 0;
    // this.outAudio.onended = null;
    // clearTimeout((<any>window).timeoutCall);
  }

  openPeer() {
    // if (this.cameraStream) console.log('stream ready')
    this.Peer = new SimplePeer({
      initiator: this.isInitiator,
      trickle: false,
      stream: this.cameraStream,
      iceTransportPolicy: "relay",
      config: {
        iceServers: [/* { urls: 'stun:stun.l.google.com:19302' }, { urls: 'stun:global.stun.twilio.com:3478?transport=udp' }, */]
      } 
    });
    this.Peer.on('connect', () => {
      this.socket.emit('in-call', { room: this.roomId });
      console.log("peer:connect: ", this.isStreming)
    });
    this.Peer.on('signal', (data) => {
      if (data.type === 'offer') {
        this.userPeer = JSON.stringify(data);
        console.log('peer:signal:userPeer');
      }
      else {
        this.userPeer = JSON.stringify(data);
        console.log('peer:signal:targetPeer');
      }
      this.socket.emit('start-call', { room: this.roomId, data: data });
    });
    this.Peer.on('stream', (stream) => {
      console.log('peer:stream', stream);
      this.isStreming = true;
      this.remoteVideo.nativeElement.srcObject = stream;
      // this.remoteVideo.nativeElement.onloadedmetadata = (e) => this.remoteVideo.nativeElement.play();
      this.remoteVideo.nativeElement.play();
    });
    this.Peer.on('negotiate', (data) => {
      console.log("peer:negotiate");
    });
    this.Peer.on('track', (track, streams) => {
      // console.log('track', track);
      // console.log('track:stream', stream);
      this.remoteStream = streams;
      console.log('peer:track:stream');
    });
    this.Peer.on('data', (data) => {
      let message:string = data.toString();
      console.log('peer:message:', message);
      if (message === 'heart') {
        this.thumbShow = false;
        this.heartShow = true;
        setTimeout(() => {
          this.heartShow = false;
        }, 5000);
      }
      else if (message === 'thumb') {
        this.heartShow = false;
        this.thumbShow = true;
        setTimeout(() => {
          this.thumbShow = false;
        }, 5000);
      }
      else {
        this.messageChat.push(message);
        this.scrollChatBottom();
      }
    });
    this.Peer.on('close', () => {
      console.log('peer:close');
      this.isStreming = false;
      // this.stopWebRTC();
      this.socket.emit('stop-call', { room: this.roomId });
    });
    this.Peer.on('error', (err) => {
      console.log('peer:error:', err);
      // this.destroyPeer();
      this.socket.emit('stop-call', { room: this.roomId });
    });
  }

  async swapPeer() {
    // console.log('local stream:', this.cameraStream);
    this.newUserMedia();
  }

  closePeer() {
    if (this.Peer) {
      this.Peer.destroy();
      this.Peer = null;
      this.remoteVideo.nativeElement.pause();
      this.remoteVideo.nativeElement.srcObject = null;
    }
  }

  switchAudio() {
    this.isMuted = !this.isMuted;
    if (this.cameraStream) {
      this.cameraStream.getAudioTracks()[0].enabled = !this.isMuted;
    }
  }

  async switchVideo() {
    if (this.devicesId.length > 1) {
      const index = this.cameraIndex === 0 ? 1 : 0;
      this.cameraIndex = index;

      await this.newUserMedia();
      // TODO: this.swapPeer();
    }
  }

  registerDevices() {
    // if (this.devicesId.length > 0) return;
    navigator.mediaDevices.enumerateDevices()
    .then((devicesId) => {
      devicesId.forEach((device) => {
        // console.log(device.kind + ": " + device.label + " id = " + device.deviceId);
        if (device.kind === 'videoinput') {
          if (this.helper.inArray(this.devicesId, device.deviceId)) {
            this.devicesId.push(device.deviceId);
          }
        }
        if (this.devicesId.length > 1) {
          this.canSwitchCamera = true;
        }
      });
    })
    .catch((e) => {
      console.log(e.name + ": " + e.message);
    });
  }

  unregisterDevice() {
    this.devicesId = [];
  }

  subscribeSocket() {
    this.socket.connect();
    this.socket.emit('subscribe', this.roomId);
    this.onStartCall = this.on('start-call').subscribe((socket: any) => {
      let targetPeerN = JSON.stringify(socket.data);
      if (socket.data.type === 'offer') {
        if (this.isInitiator === false) {
          console.warn('socket:signal:offer:', socket.data);
          if (this.Peer && !this.Peer.destroyed) {
            this.Peer.signal(JSON.parse(targetPeerN));
          }
          else {
            this.targetPeer = targetPeerN;
            this.incommingCall();
          }
        }
      }
      else {
        if (this.isInitiator) {
          console.warn('socket:signal:answer:', socket.data);
          if (this.Peer && !this.Peer.destroyed) {
            if (this.targetPeer) this.Peer.signal(JSON.parse(targetPeerN));
            else {
              this.targetPeer = targetPeerN;
              if (this.Peer) this.Peer.signal(JSON.parse(this.targetPeer));
            }
          }
        }
      }
    });
    this.onInCall = this.on('reject-call').subscribe(() => {
      console.warn("reject-call");
      if (this.isInitiator) {
        this.rejectedCall();
      }
    });
    this.onInCall = this.on('in-call').subscribe(() => {
      console.warn("in-call");
      this.isStreming = true;
      this.isIncommingCall = false;
      this.inCallStart();
    });
    this.onChatCall = this.on('chat-call').subscribe((socket: any) => {
      console.warn(socket);
    });
    this.onStopCall = this.on('stop-call').subscribe(() => {
      console.warn("stop-call");
      this.inCallEnd();
      if (this.isInitiator === false) {
        this.incommingCallEnded();
        if (this.cameraStream) this.endCall();
      }
      else {
        if (this.cameraStream) this.endCall();
      }
    });
  }

  unsubscribeSocket() {
    this.onStartCall.unsubscribe();
    this.onInCall.unsubscribe();
    this.onChatCall.unsubscribe();
    this.onStopCall.unsubscribe();
    this.socket.emit('unsubscribe', this.roomId);
    this.socket.disconnect();
  }

  on(name) {
    let observable = new Observable(observer => {
      this.socket.on(name, (data) => {
        observer.next(data);
      });
    })
    return observable;
  }

  checkPermissions() {
    this.androidPermissions.checkPermission(this.androidPermissions.PERMISSION.CAMERA)
    .then(
      success => console.log("Hey you have permission"),
      err => {
        console.log("Uh oh, looks like you don't have permission");
        this.androidPermissions.requestPermission(this.androidPermissions.PERMISSION.CAMERA);
      }
    );
    this.androidPermissions.checkPermission(this.androidPermissions.PERMISSION.RECORD_AUDIO)
    .then(
      success => console.log("Hey you have permission"),
      err => {
        console.log("Uh oh, looks like you don't have permission");
        this.androidPermissions.requestPermission(this.androidPermissions.PERMISSION.RECORD_AUDIO);
      }
    );
    this.androidPermissions.requestPermissions([
      this.androidPermissions.PERMISSION.CAMERA,
      this.androidPermissions.PERMISSION.RECORD_AUDIO
    ]);
  }

  showLoading() {
    this.loaderCtrl = this.loadingCtrl.create({
      content: "Mohon tunngu ...",
      duration: 5000
    })
    this.loaderCtrl.present();
  }

  hideLoading() {
    this.loaderCtrl.dismiss();
  }

  showToast(msg) {
    let toast = this.toastCtrl.create({
      message: msg,
      duration: 5000,
      showCloseButton: true,
      closeButtonText: "ok",
      position: "bottom"
    });
    toast.present();
  }

  toggleHeart() {
    this.sendingThumb = false;
    this.sendingHeart = true;
    if (this.Peer && !this.Peer.destroyed) this.Peer.send('heart');
    setTimeout(() => { this.sendingHeart = false; }, 5000);
  }

  toggleThumb() {
    this.sendingHeart = false;
    this.sendingThumb = true;
    if (this.Peer && !this.Peer.destroyed) this.Peer.send('thumb');
    setTimeout(() => { this.sendingThumb = false; }, 5000);
  }

  sendMessage() {
    this.messageInput.setBlur();
    if (this.chatMessage.length < 2) return;
    this.Peer.send(this.chatMessage);
    let msg = 'saya: ' + this.chatMessage;
    this.messageChat.push(msg);
    this.chatMessage = '';
    this.scrollChatBottom();
  }

  formatMessage = (text: string): string => {
    return text.replace('saya: ', '');
  }

  scrollChatBottom() {
    if (this.messageChat.length < 5) return;
    setTimeout(() => {
      this.chatContainer.nativeElement.scrollTo(0, this.chatContainer.nativeElement.scrollHeight, 300);
    }, 300);
  }

  startTimer() {
    if (this.timeInterval) return;
    this.timeInterval = setInterval(() => {
      this.s++;
      if (this.s >= 60) {
        this.s = 0; this.m++;
      }
      if (this.m >= 60) {
        this.m = 0; this.h++;
      }
      let dm = this.m < 10 ? "0" + this.m:this.m;
      let ds = this.s < 10 ? "0" + this.s:this.s;
      this.timeCounter = this.h + ":" + dm + ":" + ds;
    }, 1000);
  }

  stropTimer() {
    this.timeCounter = null;
    this.h = 0;
    this.m = 0;
    this.s = 0;
    if (this.timeInterval) {
      clearInterval(this.timeInterval);
      this.timeInterval = null;
    }
  }

  timeNow() {
    setInterval(() => {
      let date = new Date();
      let time = date.getTime() / 1000;
      this.timeClock = this.getHHMM(time);
    }, 1000);
  }

  getHHMM = (t: number) => {
    let d = new Date(t * 1000);
    let h = d.getHours();
    let m = d.getMinutes();
    let s = d.getSeconds();
    let a = "";
    let ms = "";
    let ss = "";
    if (h > 0 && h < 12) {
      a = "AM";
    } else {
      if (h == 0) a = "AM";
      else a = "PM";
    }
    if (m < 10) ms = "0" + m;
    else ms = "" + m;
    if (s < 10) ss = "0" + s;
    else ss = "" + s;
    return (h == 0 || h == 12 ? 12 : h % 12) + ":" + ms + ":" + ss + " " + a;
  };

}