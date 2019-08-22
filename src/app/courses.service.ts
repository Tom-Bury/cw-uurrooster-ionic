import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { HTTP } from '@ionic-native/http/ngx';
import { from } from 'rxjs';

import { ParsedEntry } from './interfaces/parsed-entry';
import { CourseEntry } from './interfaces/course-entry';

import { parse } from 'parse5';
import { Events } from '@ionic/angular';
import { SettingsEntry } from './interfaces/settings-entry';

@Injectable({
  providedIn: 'root'
})
export class CoursesService {

  rawData = '';
  parsedEntries: ParsedEntry[] = [];
  courseEntries: CourseEntry[] = [];
  selectedEntries: CourseEntry[] = [];
  filter: string[] = ['H04G1B'];

  url1 = 'https://people.cs.kuleuven.be/~btw/roosters1920/cws_semester_1.html';
  startWeek1 = 39;
  nbCols1 = 19;
  nbNonWeekCols1 = 6;
  year1 = 2019;

  url2 = 'https://people.cs.kuleuven.be/~btw/roosters1920/cws_semester_2.html';
  startWeek2 = 7;
  nbCols2 = 21;
  nbNonWeekCols2 = 6;
  year2 = 2020;

  URL = this.url1;
  NB_COLS = this.nbCols1;
  NB_NON_WEEK_COLS = this.nbNonWeekCols1;
  START_WEEK = this.startWeek1;
  YEAR = this.year1;

  constructor(
    private oldHttp: HttpClient,
    private http: HTTP,
    private events: Events
  ) { }

  init() {
    return this.fetchData()
      .subscribe(data => {
        this.rawData = data.data;
        this.parseData();
        this.makeCourseEntries();
        this.filterCourseEntries();
        this.sortCourseEntries();
        this.sendEvent();
      }, err => {
        console.log('Native Call error: ', err);
        console.log('GETTING DATA FROM ASSETS');
        this.getDataFromAssets();
      });
  }

  sendEvent() {
    this.events.publish('data-ready');
  }

  getSelectedEntries(): CourseEntry[] {
    return this.selectedEntries;
  } 

  fetchData() {
    const httpCall = this.http.get('URL', {}, {});
    return from(httpCall);
    // .subscribe(data => {
    //   this.rawData = data.data;
    // }, err => {
    //   console.log('Native Call error: ', err);
    //   console.log('GETTING DATA FROM ASSETS');
    //   this.getDataFromAssets();
    // });
  }

  getDataFromAssets() {
    const obs = this.oldHttp.get('/assets/dummyData.html');

    obs.subscribe(data => {
      console.log('DATA', data);
    }, err => {
      console.log('ERR', err);
      this.rawData = err.error.text;

      this.parseData();
      this.makeCourseEntries();
      this.filterCourseEntries();
      this.sortCourseEntries();
      this.sendEvent();
    });
  }

  parseData() {
    const parsedData = parse(this.rawData);
    const table = parsedData.childNodes[0].childNodes[1].childNodes[4];
    const tableRows = table.childNodes[1].childNodes.filter(node => node.nodeName !== '#text').slice(3);

    tableRows.forEach(row => {
      const cols = row.childNodes;
      const courseData: string[] = [];
      const weekData: number[] = [];
      let colNb = 0;

      cols.forEach(entry => {
        if (entry.childNodes.length > 0) {
          // First columns
          const data = entry.childNodes[0].value;
          courseData.push(data);
          // console.log(data);
        } else if (entry.attrs.length > 0) {
          // Week columns
          const week = colNb - this.NB_NON_WEEK_COLS + this.START_WEEK;
          weekData.push(week);
          // console.log(week);
        }
        colNb++;
      });

      this.parsedEntries.push(this.makeParsedEntry(courseData, weekData));
    });
  }

  makeParsedEntry(parsedData: string[], parsedWeeks: number[]): ParsedEntry {
    return {
      courseName: parsedData[5],
      day: parsedData[0],
      ola: parsedData[4],
      opo: parsedData[3],
      room: parsedData[2],
      timeFrame: parsedData[1],
      weeks: parsedWeeks
    };
  }

  makeCourseEntries() {
    this.parsedEntries.forEach(parsedEntry => {

      parsedEntry.weeks.forEach(week => {

        const timeSplit = parsedEntry.timeFrame.split('-');
        const d = this.makeDate(parsedEntry.day, week, this.YEAR, timeSplit[0], timeSplit[1]);
        const dateStr = d[0].getDate() + '/' + (d[0].getMonth() + 1);

        const courseEntry: CourseEntry = {
          courseName: parsedEntry.courseName,
          dateStart: d[0],
          dateEnd: d[1],
          dateString: dateStr,
          day: parsedEntry.day,
          ola: parsedEntry.ola,
          opo: parsedEntry.opo,
          room: parsedEntry.room,
          timeStart: timeSplit[0],
          timeEnd: timeSplit[1],
          weekNb: week
        };

        this.courseEntries.push(courseEntry);
      });

    });
  }

  filterCourseEntries() {
    this.selectedEntries = this.courseEntries.filter(entry => {
      return this.filter.includes(entry.opo);
    });
  }

  sortCourseEntries() {
    this.selectedEntries.sort((o1, o2) => {
      if (o1.dateEnd < o2.dateEnd) {
        return -1;
      } else if (o1.dateStart > o2.dateEnd) {
        return 1;
      } else {
        return 0;
      }
    });
  }

  makeDate(dayStr: string, week: number, year: number, startTime: string, endTime: string) {
    const start = startTime.split(':');
    const end = endTime.split(':');
    const days = ['Maandag', 'Dinsdag', 'Woensdag', 'Donderdag', 'Vrijdag'];
    const day = (days.indexOf(dayStr) + (week - 1) * 7); // 1st of January + 7 days for each week

    return [new Date(year, 0, day, +start[0], +start[1]), new Date(year, 0, day, +end[0], +end[1])];
  }


  getAllCourses() {
    const allOPOs = new Set([]);

    this.courseEntries.forEach(entry => {
      const settingsEntry: SettingsEntry = {
        courseName: entry.courseName,
        ola: entry.ola,
        opo: entry.opo
      };
      allOPOs.add(settingsEntry);
    });

    return allOPOs;
  }

}
