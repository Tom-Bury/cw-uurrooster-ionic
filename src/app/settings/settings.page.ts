import { Component, OnInit } from '@angular/core';
import { CoursesService } from '../courses.service';
import { SettingsEntry } from '../interfaces/settings-entry';
import { Events } from '@ionic/angular';

@Component({
  selector: 'app-settings',
  templateUrl: './settings.page.html',
  styleUrls: ['./settings.page.scss'],
})
export class SettingsPage implements OnInit {

  allCourses: SettingsEntry[] = [];
  selectedCourses: string[] = [];

  constructor(
    public coursesSvc: CoursesService,
    private events: Events
  ) { }

  ngOnInit() {
    this.allCourses = this.coursesSvc.getAllCourses();
    this.selectedCourses = this.coursesSvc.getFilter();
  }

  onCourseSelected(opo: string) {
    this.coursesSvc.toggleEntrySelectionInFilter(opo);
    this.selectedCourses = this.coursesSvc.getFilter();
  }

}
