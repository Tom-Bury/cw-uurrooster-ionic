import {
  Component,
  OnInit,
  ViewChild
} from '@angular/core';
import {
  CoursesService
} from '../courses.service';
import {
  SettingsEntry
} from '../interfaces/settings-entry';
import {
  Events,
  LoadingController,
  IonContent
} from '@ionic/angular';


@Component({
  selector: 'app-settings',
  templateUrl: './settings.page.html',
  styleUrls: ['./settings.page.scss'],
})
export class SettingsPage implements OnInit {

  @ViewChild(IonContent, null) content: IonContent;

  allCourses: SettingsEntry[] = [];
  selectedCourses: string[] = [];
  currSem: number;
  justHadInit = true;

  constructor(
    public coursesSvc: CoursesService,
    private events: Events,
    private loadingCtrl: LoadingController
  ) {}

  async ngOnInit() {
    this.fetchData();

    if (this.currSem === 1) {
      document.getElementById('seg-sem1').setAttribute('checked', 'true');
      document.getElementById('seg-sem2').setAttribute('checked', 'false');
    } else {
      document.getElementById('seg-sem1').setAttribute('checked', 'false');
      document.getElementById('seg-sem2').setAttribute('checked', 'true');
    }
  }

  onCourseSelected(opo: string) {
    this.coursesSvc.toggleEntrySelectionInFilter(opo);
    this.selectedCourses = this.coursesSvc.getFilter();
  }

  async onSegmentChange(evt: any) {
    if (!this.justHadInit) {
      const spinner = await this.loadingCtrl.create();
      await spinner.present();
      this.coursesSvc.switchSemester();

      this.events.subscribe('data-ready', () => {
        this.fetchData();
        spinner.dismiss();
        this.content.scrollToTop();
      });
    }
    else {
      this.justHadInit = false;
    }
  }



  renameCourses() {
    this.allCourses.forEach(entry => {
      if (entry.courseName.includes(':') && !entry.courseName.toLowerCase().startsWith('capita')) {
        const colonPos = entry.courseName.indexOf(':');
        entry.courseName = entry.courseName.substring(0, colonPos);
      }
    });
  }

  fetchData() {
    this.currSem = this.coursesSvc.getCurrentSemester();
    this.allCourses = this.coursesSvc.getAllCourses();
    this.selectedCourses = this.coursesSvc.getFilter();
    this.renameCourses();
  }


  ionViewWillLeave() {
    this.coursesSvc.saveFilterToDB();
  }
}