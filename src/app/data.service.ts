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


@Injectable({
  providedIn: 'root'
})
export class DataService {

  // VARIABLES //
  rawData = '-1';
  allEntries: CourseEntry[][] = [];
  coursesFilter: string[] = [];

  // IMPORTANT UNIVERSAL VARIABLES //
  FILTER_KEY_BASE = 'courses-filter-sem-';
  DATA_KEY_BASE = 'courses-data-sem-';

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
    // Data is fetched on 3 levels (so you can debug in Chrome devtools w/o device)
    this.fetchDataFromInternet();
  }

  fetchDataFromInternet() {
    const httpCall = this.http.get(this.URL, {}, {});

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
    const obs = this.oldHttp.get(this.DUMMY);

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

            const url = cols[4].childNodes[0].rawAttrs;
            const startIndex = url.indexOf('/e/') + 3;
            const endIndex = url.indexOf('.htm');
            const currOpo = url.substring(startIndex, endIndex);

            const courseEntry: CourseEntry = {
              courseName: currEntryName,
              dateStart: currDate,
              dateEnd: currDate,
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

          });
          break;

        default:
          console.error('Dont know what to do with this element: ' + el.tagName);
          break;
      }
    });

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

  getCurrentSemester(): number {
    if (this.URL === this.url1) {
      return 1;
    } else {
      return 2;
    }
  }

  getSelectedEntries(): CourseEntry[][] {
    //const selectedEntries = this.filterCourseEntries();
    // return this.markOverlap(selectedEntries);
    return this.allEntries;
  }
  
  getFilter() {
    return this.coursesFilter;
  }





  // - - - - - - - -
  // OTHER METHODS
  // - - - - - - - -

  filterCourseEntries() {
    const filter = this.getFilter();
    
    if (filter === []) {
      return this.allEntries;
    }
    else {
      //...
      return null;
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
}