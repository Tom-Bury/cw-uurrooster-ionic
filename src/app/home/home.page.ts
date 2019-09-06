import {
  Component,
  OnInit,
  ViewChild,
  ElementRef
} from '@angular/core';
import {
  LoadingController,
  Events,
  IonList
} from '@ionic/angular';
import {
  ParsedEntry
} from '../interfaces/parsed-entry';
import {
  CourseEntry
} from '../interfaces/course-entry';
import {
  CoursesService
} from '../courses.service';

import {
  Plugins
} from '@capacitor/core';
const {
  SplashScreen
} = Plugins;





@Component({
  selector: 'app-home',
  templateUrl: 'home.page.html',
  styleUrls: ['home.page.scss'],
})
export class HomePage implements OnInit {

  rawData = '';
  selectedEntries: CourseEntry[][] = [];
  currSem: number;


  constructor(
    private loadingCtrl: LoadingController,
    public coursesSvc: CoursesService,
    private events: Events
  ) {}

  async ngOnInit() {

    this.events.subscribe('data-ready', () => {
      this.selectedEntries = this.coursesSvc.getSelectedEntries();
      this.currSem = this.coursesSvc.getCurrentSemester();
      
      setTimeout(() => {
        SplashScreen.hide();

        setTimeout(() => {
          console.log('Scrolling');
          
          this.scrollToToday();
        }, 100);
      }, 100);
    });

    this.coursesSvc.init();
  }

  ionViewWillEnter() {
    this.selectedEntries = this.coursesSvc.getSelectedEntries();
  }

  ionViewWillLeave() {
    this.coursesSvc.saveFilterToDB();
  }

  ionViewDidEnter() {
    this.scrollToToday();
  }

  scrollToToday() {
    if (this.selectedEntries.length > 0) {
      const today = new Date();
      let closest = this.selectedEntries[0][0];

      this.selectedEntries.forEach(day => {

        const currDate = day[0].dateStart;

        if (today > currDate) {
          closest = day[0];
        }

      });

      document.getElementById(closest.dateString).scrollIntoView({behavior: 'smooth', block: 'start', inline: 'nearest'});
    }
  }

}