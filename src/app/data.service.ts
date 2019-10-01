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
  Events
} from '@ionic/angular';
import {
  from
} from 'rxjs';
import {
  Storage
} from '@ionic/storage';
import {
  parse
} from 'node-html-parser';
import {
  CourseEntry
} from './interfaces/course-entry';
import {
  SettingsEntry
} from './interfaces/settings-entry';


@Injectable({
  providedIn: 'root'
})
export class DataService {

  // VARIABLES //
  rawData = '-1';
  allEntries: CourseEntry[][][] = [];
  coursesFilter: string[] = [];
  allCourses = {};

  // IMPORTANT UNIVERSAL VARIABLES //
  FILTER_KEY_BASE = 'courses-filter-sem-';
  DATA_KEY_BASE = 'courses-data-sem-';
  SEMESTER_KEY = 'last-selected-sem';

  url1 = 'https://people.cs.kuleuven.be/~btw/roosters1920/cws_semester_1.html';
  dummy1 = '/assets/dummyData.html';

  url2 = 'https://people.cs.kuleuven.be/~btw/roosters1920/cws_semester_2.html';
  dummy2 = '/assets/dummyData2.html';

  currentSemester = 1;

  constructor(
    private oldHttp: HttpClient,
    private http: HTTP,
    private events: Events,
    private storage: Storage
  ) {}

  init() {
    this.storage.ready().then(() => {
      this.fetchData();
    });
  }

  // - - - - - - - -
  // DATA FETCHING
  // - - - - - - - -

  fetchData() {
    // First fetch semester, then filter, then data from internet.

    this.storage.get(this.SEMESTER_KEY).then((sem) => {

      this.currentSemester = sem;
      const key = this.FILTER_KEY_BASE + this.getCurrentSemester();

      this.storage.get(key).then((filter) => {

        if (filter === null) {
          filter = [];
        }

        this.coursesFilter = filter;

        this.fetchDataFromInternet();
      });
    });
  }

  fetchDataFromInternet() {
    const httpCall = this.http.get(this.getUrl(), {}, {});

    from(httpCall)
      .subscribe(data => {
        console.log('Http response data: ', data);
        const key = this.DATA_KEY_BASE + this.getCurrentSemester();
        this.rawData = data.data;

        this.storage.set(key, data.data)
          .then(
            () => {
              this.afterDataFetch();
            },
            error => {
              console.error('Error storing item', error);
              this.afterDataFetch();
            }
          );

      }, err => {
        console.error('Could not fetch data over HTTP: ', err);
        this.fetchDataFromDB();
      });
  }

  fetchDataFromDB() {
    const key = this.DATA_KEY_BASE + this.getCurrentSemester();

    this.storage.get(key).then((oldData) => {

      if (oldData !== null) {
        console.log('Fetched old data from DB: ', oldData);
        this.rawData = oldData;
        this.afterDataFetch();
      } else {
        console.error('Could not fetch old data from DB');
        this.fetchDummyDataFromAssets();
      }
    });
  }

  fetchDummyDataFromAssets() {
    const obs = this.oldHttp.get(this.getDummy());

    obs.subscribe(data => {
      console.log('Dummy data from assets: ', data);
    }, err => {
      console.log('Error from assets (actually contains the data so it is ok...): ', err);
      this.rawData = err.error.text;
      this.afterDataFetch();
    });
  }

  // - - - - - - - -
  // DATA PARSING
  // - - - - - - - -

  afterDataFetch() {
    // Preprocess mistakes from data + remove all newlines:
    this.rawData = this.replaceAll(this.rawData, '</i></b>', '</b></i>');
    this.rawData = this.replaceAll(this.rawData, '\r\n', '');
    this.rawData = this.replaceAll(this.rawData, '\n', '');

    let data = this.removeFirstAndLastBit(this.rawData);
    data = this.removeHorizontalRules(data);

    this.allEntries = this.makeEntries(data);

    this.sendDataReady();
  }

  removeFirstAndLastBit(data) {
    // Filter the first & last part away (between first and last big hr is the real data)
    const htmlTag = parse(data).childNodes[0].childNodes;

    let startIndex = -1;
    let endIndex = -1;

    htmlTag.forEach((el, i) => {
      if (el.toString().startsWith('<hr color="black" size="4"')) {
        if (startIndex < 0) {
          startIndex = ++i;
        } else {
          endIndex = i;
        }
      }
    });

    return htmlTag.slice(startIndex, endIndex);
  }

  removeHorizontalRules(data) {
    return data.filter(el => {
      return el.tagName !== 'hr';
    });
  }

  makeEntries(data) {
    const weekData = [];

    let currWeekEntries: CourseEntry[][] = [];
    let currDayEntries: CourseEntry[] = [];
    let initial = true;

    let currWeekNb = -1;
    let currDay = '-1';
    let currDate = new Date(1997, 4, 27);

    data.forEach(el => {

      switch (el.tagName) {
        case 'h2':
          const weekNb = this.getWeekNumber(el);

          if (!initial) {
            currWeekEntries.push(currDayEntries);
            currDayEntries = [];
            weekData.push(currWeekEntries);
            currWeekEntries = [];
            currWeekNb = weekNb;
          } else {
            currWeekNb = weekNb;
          }
          break;

        case 'i':
          if (!initial && currDayEntries.length > 0) {
            currWeekEntries.push(currDayEntries);
            currDayEntries = [];
          } else {
            initial = false;
          }
          currDay = this.getDay(el);
          currDate = this.getDate(el);
          break;

        case 'table':
          const rows = el.childNodes;

          rows.forEach(row => {
            const cols = row.childNodes;

            const hours = cols[0].rawText.split('&#8212;');
            const currRoom = cols[2].rawText.split(' ').filter(el => el !== '');
            const currEntryName = cols[4].rawText;

            const startHour = hours[0].split(':')[0];
            const startMin = hours[0].split(':')[1];
            const currStartDate = new Date(+currDate);
            currStartDate.setHours(startHour, startMin);

            const endHour = hours[1].split(':')[0];
            const endMin = hours[1].split(':')[1];
            const currEndDate = new Date(+currDate);
            currEndDate.setHours(endHour, endMin);

            const url = cols[4].childNodes[0].rawAttrs;
            const currOpo = url.slice(-26, -19);

            const courseEntry: CourseEntry = {
              courseName: currEntryName,
              dateStart: currStartDate,
              dateEnd: currEndDate,
              dateString: currDate.getDate() + '/' + (currDate.getMonth() + 1),
              day: currDay,
              ola: currOpo,
              opo: currOpo,
              room: currRoom.join(' - '),
              timeStart: hours[0],
              timeEnd: hours[1],
              weekNb: currWeekNb,
              overlap: false
            };

            currDayEntries.push(courseEntry);

            const settingsEntry: SettingsEntry = {
              courseName: currEntryName,
              opo: currOpo,
              ola: currOpo
            };

            this.allCourses[currOpo] = settingsEntry;
          });
          break;

        default:
          console.error('Dont know what to do with this element: ' + el.tagName);
          break;
      }
    });

    currWeekEntries.push(currDayEntries);
    weekData.push(currWeekEntries);

    return weekData;
  }

  getWeekNumber(el): number {
    let weekStr = el.rawText;
    weekStr = weekStr.replace('Week ', '');
    return parseInt(weekStr, 10);
  }

  getDay(el) {
    const spaceIndex = el.childNodes[0].childNodes[0].rawText.indexOf(' ');
    return el.childNodes[0].childNodes[0].rawText.substring(0, spaceIndex);
  }

  getDate(el): Date {
    let rawText = el.childNodes[0].childNodes[0].rawText;
    rawText = rawText.substring(0, rawText.length - 1);
    const spaceIndex = rawText.indexOf(' ') + 1;
    const dateString = rawText.substring(spaceIndex);

    const dateNbs = dateString.split('.');
    const dayNb = parseInt(dateNbs[0], 10);
    const monthIndex = parseInt(dateNbs[1], 10) - 1;
    const yearNb = parseInt(dateNbs[2], 10);

    return new Date(yearNb, monthIndex, dayNb);
  }




  // - - - - - - - -
  // INTERFACE TO OUTSIDE
  // - - - - - - - -

  switchSemester() {
    this.saveFilterToDB();

    this.rawData = '';
    this.allEntries = [];
    this.allCourses = [];
    this.coursesFilter = [];

    if (this.currentSemester === 1) {
      this.currentSemester = 2;
    } else {
      this.currentSemester = 1;
    }

    this.storage.set(this.SEMESTER_KEY, this.currentSemester)
      .then(
        () => {
          console.log('Stored semester!', this.currentSemester);
          this.init();
        },
        error => {
          console.error('Error storing semester', error);
          this.init();
        }
      );
  }

  getCurrentSemester(): number {
    console.log('GetCurrentSemster: ', this.currentSemester);
    return this.currentSemester;
  }

  getSelectedEntries(): CourseEntry[][][] {
    const selectedEntries = this.filterCourseEntries();
    return this.markOverlap(selectedEntries);
  }

  getFilter() {
    return this.coursesFilter;
  }

  getAllCourses(): SettingsEntry[] {
    return Object.values(this.allCourses);
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


  saveFilterToDB() {
    const key = this.FILTER_KEY_BASE + this.getCurrentSemester();

    this.storage.set(key, this.coursesFilter)
      .then(
        () => console.log('Stored filter!', this.coursesFilter),
        error => console.error('Error storing item', error)
      );

  }


  // - - - - - - - -
  // OTHER METHODS
  // - - - - - - - -

  filterCourseEntries() {
    const filter = this.getFilter();

    if (filter.length > 0) {
      const filteredEntries: CourseEntry[][][] = [];

      let currWeek = [];
      let currDay = [];

      this.allEntries.forEach(week => {

        currWeek = [];

        week.forEach(day => {

          currDay = [];

          day.forEach(entry => {

            if (filter.includes(entry.opo)) {
              currDay.push(entry);
            }

          });

          if (currDay.length > 0) {
            currWeek.push(currDay);
          }

        });

        if (currWeek.length > 0) {
          filteredEntries.push(currWeek);
        }

      });

      return filteredEntries;
    } else {
      return [];
    }
  }

  markOverlap(entries) {
    const filteredEntries: CourseEntry[][][] = [];

    if (entries.length > 0) {

      entries.forEach(week => {

        week.forEach(day => {

          let i = 0;
          while (i + 1 < day.length) {
            const currEntry = day[i];
            const nextEntry = day[i + 1];

            if (
              currEntry.dateEnd > nextEntry.dateStart 
              ) {
              currEntry.overlap = true;
              nextEntry.overlap = true;
            }

            i++;
          }

        });
      });

      return entries;
    } else {
      return [];
    }
  }

  sendDataReady() {
    this.events.publish('data-ready');
  }

  escapeRegExp(str) {
    return str.replace(/([.*+?^=!:${}()|\[\]\/\\])/g, "\\$1");
  }

  replaceAll(str, find, replace) {
    return str.replace(new RegExp(this.escapeRegExp(find), 'g'), replace);
  }

  getUrl() {
    if (this.currentSemester === 1) {
      return this.url1;
    } else {
      return this.url2;
    }
  }

  getDummy() {
    if (this.currentSemester === 1) {
      return this.dummy1;
    } else {
      return this.dummy2;
    }
  }
}