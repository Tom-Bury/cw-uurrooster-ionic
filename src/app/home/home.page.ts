import {
  Component,
  OnInit
} from '@angular/core';
import {
  LoadingController, Events
} from '@ionic/angular';
import {
  ParsedEntry
} from '../interfaces/parsed-entry';
import {
  CourseEntry
} from '../interfaces/course-entry';
import { CoursesService } from '../courses.service';


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
  ) {
  }

  async ngOnInit() {
    const spinner = await this.loadingCtrl.create();
    await spinner.present();

    this.events.subscribe('data-ready', () => {
      this.selectedEntries = this.coursesSvc.getSelectedEntries();
      this.currSem = this.coursesSvc.getCurrentSemester();
      spinner.dismiss();
    });

    this.coursesSvc.init();
  }

  ionViewWillEnter() {
    this.selectedEntries = this.coursesSvc.getSelectedEntries();
  }

  ionViewWillLeave() {
    this.coursesSvc.saveFilterToDB();
  }

}
