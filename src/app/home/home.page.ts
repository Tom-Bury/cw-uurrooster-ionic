import {
  Component,
  OnInit
} from '@angular/core';
import {
  LoadingController,
  Events,
  IonList
} from '@ionic/angular';
import {
  CourseEntry
} from '../interfaces/course-entry';
import {
  CoursesService
} from '../courses.service';

import {
  Plugins
} from '@capacitor/core';
import { DataService } from '../data.service';
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
    public dataSvc: DataService,
    private events: Events
  ) {}

  async ngOnInit() {

    this.events.subscribe('data-ready', () => {
      this.selectedEntries = this.dataSvc.getSelectedEntries();

      setTimeout(() => {
        SplashScreen.hide();

        setTimeout(() => {
          this.scrollToToday();
        }, 100);
      }, 100);
    });

    this.dataSvc.init();
  }

  ionViewWillEnter() {
    this.selectedEntries = this.dataSvc.getSelectedEntries();
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
      let closest = this.selectedEntries[0][0][0];

      this.selectedEntries.forEach(week => {

        const currDate = week[0][0].dateStart;

        if (today > currDate) {
          closest = week[0][0];
        }

      });

      document.getElementById(closest.dateString).scrollIntoView({behavior: 'smooth', block: 'start', inline: 'nearest'});
    }
  }
}