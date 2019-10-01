import {
  Component,
  OnInit
} from '@angular/core';
import {
  Events
} from '@ionic/angular';
import {
  CourseEntry
} from '../interfaces/course-entry';

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
  selectedEntries: CourseEntry[][][] = [];
  currSem: number;


  constructor(
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
    this.dataSvc.saveFilterToDB();
  }

  ionViewDidEnter() {
    this.scrollToToday();
  }

  scrollToToday() {

    if (this.selectedEntries.length > 0) {
      const today = new Date();
      let closest = this.selectedEntries[0][0][0];

      console.log('today', today);
      console.log('closest start', closest);

      this.selectedEntries.forEach(week => {

        week.forEach(day => {
          const currDate = day[0].dateStart;
          if (today >= currDate) {
            closest = day[0];
          }
        });
      });

      document.getElementById(closest.dateString).scrollIntoView({behavior: 'smooth', block: 'start', inline: 'nearest'});
    }
  }
}