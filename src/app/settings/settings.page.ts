import { Component, OnInit } from '@angular/core';
import { CoursesService } from '../courses.service';
import { SettingsEntry } from '../interfaces/settings-entry';
import { Events, LoadingController } from '@ionic/angular';
import { CourseEntry } from '../interfaces/course-entry';

@Component({
  selector: 'app-settings',
  templateUrl: './settings.page.html',
  styleUrls: ['./settings.page.scss'],
})
export class SettingsPage implements OnInit {

  allCourses: SettingsEntry[] = [];
  selectedCourses: string[] = [];
  currSem: number;
  justHadInit = false;

  constructor(
    public coursesSvc: CoursesService,
    private events: Events,
    private loadingCtrl: LoadingController
  ) { }

  ngOnInit() {
    this.currSem = this.coursesSvc.getCurrentSemester();
    this.allCourses = this.coursesSvc.getAllCourses();
    this.selectedCourses = this.coursesSvc.getFilter();
    this.renameCourses();
    this.justHadInit = true;

    // if (this.currSem === 1) {
    //   document.getElementById('seg-sem1').setAttribute('checked', 'true');
    //   document.getElementById('seg-sem2').setAttribute('checked', 'false');
    // } else {
    //   document.getElementById('seg-sem1').setAttribute('checked', 'false');
    //   document.getElementById('seg-sem2').setAttribute('checked', 'true');
    // }

    this.justHadInit = false;
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
        this.ngOnInit();
        spinner.dismiss();
    });
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

}
