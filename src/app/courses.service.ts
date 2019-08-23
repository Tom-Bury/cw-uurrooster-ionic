import {
  Injectable
} from '@angular/core';
import {
  HttpClient
} from '@angular/common/http';
import {
  HTTP
} from '@ionic-native/http/ngx';
import {
  from
} from 'rxjs';

import {
  ParsedEntry
} from './interfaces/parsed-entry';
import {
  CourseEntry
} from './interfaces/course-entry';

import {
  Events
} from '@ionic/angular';
import {
  SettingsEntry
} from './interfaces/settings-entry';
import {
  filter
} from 'rxjs/operators';


import { parse } from 'node-html-parser';

@Injectable({
  providedIn: 'root'
})
export class CoursesService {

  rawData = '';
  parsedEntries: ParsedEntry[] = [];
  courseEntries: CourseEntry[] = [];
  selectedEntries: CourseEntry[] = [];

  allCourseOPOs: Set < string > = new Set([]);
  allCourses: SettingsEntry[] = [];
  coursesFilter: string[] = ['H04G1B'];

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
  ) {}

  init() {
    this.fetchData();
  }

  sendEvent() {
    this.events.publish('data-ready');
  }

  getSelectedEntries(): CourseEntry[] {
    this.filterCourseEntries();
    this.sortCourseEntries();
    this.markOverlap();
    this.addDaySeparators();
    return this.selectedEntries;
  }

  toggleEntrySelectionInFilter(opo) {
    if (this.coursesFilter.includes(opo)) {
      this.coursesFilter = this.coursesFilter.filter(o => {
        return o !== opo;
      });
    } else {
      this.coursesFilter.push(opo);
    }
  }

  getFilter() {
    return this.coursesFilter;
  }

  getAllCourses() {
    return this.allCourses.sort((o1, o2) => {
      if (o1.courseName < o2.courseName) {
        return -1;
      } else if (o1.courseName > o2.courseName) {
        return 1;
      } else {
        return 0;
      }
    });
  }

  fetchData() {
    const httpCall = this.http.get('URL', {}, {});
    from(httpCall)
      .subscribe(data => {
        this.rawData = data.data;
        this.parseData();
        this.makeCourseEntries();
        this.sendEvent();
      }, err => {
        console.log('Native Call error: ', err);
        this.getDataFromAssets();
      });
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
      this.sendEvent();
    });
  }

  parseData() {
    const parsedData = parse(this.rawData);
    const table = parsedData.childNodes[0].childNodes[5];
    const tableRows = table.childNodes.filter(row => row.nodeType !== 3).slice(3);

    tableRows.forEach(row => {
        const cols = row.childNodes;
        const courseData: string[] = [];
        const weekData: number[] = [];
        let colNb = 0;

        cols.forEach(col => {

          if (col.childNodes.length > 0) {
            // First columns
            const data = col.childNodes[0].rawText;
            courseData.push(data);
            console.log(data);
          } else if (true) {
            // Week columns
            const week = colNb - this.NB_NON_WEEK_COLS + this.START_WEEK;
            weekData.push(week);
            console.log(week);
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
          weekNb: week,
          overlap: false
        };

        this.courseEntries.push(courseEntry);

        if (!this.allCourseOPOs.has(parsedEntry.opo)) {
          this.allCourseOPOs.add(parsedEntry.opo);
          this.allCourses.push({
            courseName: parsedEntry.courseName,
            ola: parsedEntry.ola,
            opo: parsedEntry.opo
          });
        }
      });
    });
  }

  filterCourseEntries() {
    this.selectedEntries = this.courseEntries.filter(entry => {
      return this.coursesFilter.includes(entry.opo);
    });
  }

  sortCourseEntries() {
    this.selectedEntries.sort((o1, o2) => {
      if (o1.dateEnd < o2.dateStart) {
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

  addDaySeparators() {
    const separatedCourseEntries: CourseEntry[] = [];

    if (this.selectedEntries.length > 0) {
      const firstDiviverEntry = {
        ...this.selectedEntries[0]
      };
      firstDiviverEntry.courseName = '$$DIVIDER$$';
      separatedCourseEntries.push(firstDiviverEntry);
    }

    let i;
    for (i = 0; i < this.selectedEntries.length - 1; i++) {
      const currEntry = this.selectedEntries[i];
      const nextEntry = this.selectedEntries[i + 1];

      if (currEntry.dateString !== nextEntry.dateString && i !== 0) {
        const dividerEntry = {
          ...currEntry
        };
        dividerEntry.courseName = '$$DIVIDER$$';
        separatedCourseEntries.push(dividerEntry);
        separatedCourseEntries.push(currEntry);
      }
      else {
        separatedCourseEntries.push(currEntry);
      }
    }
    // separatedCourseEntries.push(this.selectedEntries[this.selectedEntries.length - 1]);
    this.selectedEntries = separatedCourseEntries;
  }

  markOverlap() {
    const newSelectedCourseEntries: CourseEntry[] = [];

    let i: number;
    for (i = 0; i < this.selectedEntries.length - 1; i++) {
      const currEntry = this.selectedEntries[i];
      const nextEntry = this.selectedEntries[i + 1];

      if (currEntry.dateString === nextEntry.dateString) {
        if (currEntry.dateEnd <= nextEntry.dateStart || currEntry.dateStart >= nextEntry.dateEnd) {
          newSelectedCourseEntries.push(currEntry);
        } else {
          currEntry.overlap = true;
          nextEntry.overlap = true;
          newSelectedCourseEntries.push(currEntry);
        }
      } else {
        newSelectedCourseEntries.push(currEntry);
      }
    }

    newSelectedCourseEntries.push(this.selectedEntries[this.selectedEntries.length - 1]);
    this.selectedEntries = newSelectedCourseEntries;
  }

}
