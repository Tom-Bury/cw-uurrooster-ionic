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


import {
  parse
} from 'node-html-parser';

@Injectable({
  providedIn: 'root'
})
export class CoursesService {

  rawData = '';
  parsedEntries: ParsedEntry[] = [];
  courseEntries: CourseEntry[] = [];
  selectedEntries: CourseEntry[] = [];
  daySelectedEntries: CourseEntry[][] = [];

  allCourseOPOs: Set < string > = new Set([]);
  allCourses: SettingsEntry[] = [];
  coursesFilter: string[] = ['H04G1B'];

  url1 = 'https://people.cs.kuleuven.be/~btw/roosters1920/cws_semester_1.html';
  startWeek1 = 39;
  nbCols1 = 19;
  nbNonWeekCols1 = 6;
  year1 = 2019;
  dummy1 = '/assets/dummyData.html';

  url2 = 'https://people.cs.kuleuven.be/~btw/roosters1920/cws_semester_2.html';
  startWeek2 = 7;
  nbCols2 = 21;
  nbNonWeekCols2 = 6;
  year2 = 2020;
  dummy2 = '/assets/dummyData2.html';

  URL = this.url1;
  NB_COLS = this.nbCols1;
  NB_NON_WEEK_COLS = this.nbNonWeekCols1;
  START_WEEK = this.startWeek1;
  YEAR = this.year1;
  DUMMY = this.dummy1;

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

  getSelectedEntries(): CourseEntry[][] {
    this.filterCourseEntries();
    this.sortCourseEntries();
    this.markOverlap();
    this.groupByDay();
    return this.daySelectedEntries;
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
    const obs = this.oldHttp.get(this.DUMMY);

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
    let tableRows = table.childNodes.filter(row => row.nodeType !== 3).slice(3);
    tableRows = tableRows.filter(row => !row.toString().startsWith('<tr><td style'));

    tableRows.forEach(row => {
      const cols = row.childNodes;
      const courseData: string[] = [];
      const weekData: number[] = [];
      let colNb = 0;

      cols.forEach(col => {

        if (colNb < this.NB_NON_WEEK_COLS) {
          // First columns
          if (col.childNodes.length > 0 ) {
            const data = col.childNodes[0].rawText;
            courseData.push(data);
            // console.log(data);
          }
          else {
            courseData.push('NO DATA');
          }
        } else if (col.toString() !== '<td></td>') {
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



  markOverlap() {
    const newSelectedCourseEntries: CourseEntry[] = [];

    let i: number;
    for (i = 0; i < this.selectedEntries.length - 1; i++) {
      const currEntry = this.selectedEntries[i];
      const nextEntry = this.selectedEntries[i + 1];

      if (currEntry.dateString === nextEntry.dateString &&
        !(currEntry.dateEnd <= nextEntry.dateStart || currEntry.dateStart >= nextEntry.dateEnd)) {
        currEntry.overlap = true;
        nextEntry.overlap = true;
      }
      newSelectedCourseEntries.push(currEntry);
    }

    if (this.selectedEntries.length > 0) {
      newSelectedCourseEntries.push(this.selectedEntries[this.selectedEntries.length - 1]);
    }
    this.selectedEntries = newSelectedCourseEntries;
  }

  groupByDay() {
    let prevDateStr = '-1';
    let currDayEntries = [];
    let currWeekNb = -1;
    this.daySelectedEntries = [];

    this.selectedEntries.forEach(entry => {
      if (entry.dateString !== prevDateStr) {
        if (prevDateStr !== '-1') {
          this.daySelectedEntries.push(currDayEntries);
          currDayEntries = [];
        }
        prevDateStr = entry.dateString;
        const divider = {... entry};
        if (entry.weekNb !== currWeekNb) {
          currWeekNb = entry.weekNb;
          divider.courseName = '$$NEW-WEEK$$';
        }
        currDayEntries.push(divider);
      }
      currDayEntries.push(entry);
    });
  }

  switchSemester() {
    this.rawData = '';
    this.parsedEntries = [];
    this.courseEntries = [];
    this.selectedEntries = [];
    this.daySelectedEntries = [];

    this.allCourseOPOs = new Set([]);
    this.allCourses = [];
    this.coursesFilter = [];

    if (this.getCurrentSemester() === 1) {
      this.URL = this.url2;
      this.NB_COLS = this.nbCols2;
      this.NB_NON_WEEK_COLS = this.nbNonWeekCols2;
      this.START_WEEK = this.startWeek2;
      this.YEAR = this.year2;
      this.DUMMY = this.dummy2;
      this.coursesFilter = [];
    }
    else {
      this.URL = this.url1;
      this.NB_COLS = this.nbCols1;
      this.NB_NON_WEEK_COLS = this.nbNonWeekCols1;
      this.START_WEEK = this.startWeek1;
      this.YEAR = this.year1;
      this.DUMMY = this.dummy1;
    }
    this.init();
  }

  getCurrentSemester(): number {
    if (this.URL === this.url1) {
      return 1;
    }
    else {
      return 2;
    }
  }
}
