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

  constructor(
    public coursesSvc: CoursesService,
    private events: Events
  ) { }

  ngOnInit() {
    this.allCourses = this.coursesSvc.getAllCourses();
  }

}
