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
import { DataService } from '../data.service';


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
    public dataSvc: DataService,
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
    this.dataSvc.toggleEntrySelectionInFilter(opo);
    this.selectedCourses = this.dataSvc.getFilter();
  }

  async onSegmentChange(evt: any) {
    if (!this.justHadInit) {
      const spinner = await this.loadingCtrl.create();
      await spinner.present();
      this.dataSvc.switchSemester();

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

    this.allCourses.sort((a, b) => {
      if (a.courseName < b.courseName) {
        return -1;
      }
      if (a.courseName > b.courseName) {
        return 1;
      }
      // a must be equal to b
      return 0;
    });
  }

  fetchData() {
    this.currSem = this.dataSvc.getCurrentSemester();
    this.allCourses = this.dataSvc.getAllCourses();
    this.selectedCourses = this.dataSvc.getFilter();
    this.renameCourses();
  }


  ionViewWillLeave() {
    this.dataSvc.saveFilterToDB();
  }
}