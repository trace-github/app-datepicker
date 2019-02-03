export const enum WEEK_NUMBER_TYPE {
  FIRST_4_DAY_WEEK = 'first-4-day-week',
  FIRST_DAY_OF_YEAR = 'first-day-of-year',
  FIRST_FULL_WEEK = 'first-full-week',
}

import { stripLTRMark } from './datepicker-helpers';

function normalizeWeekday(weekday: number) {
  if (weekday >= 0 && weekday < 7) return weekday;

  const weekdayOffset = weekday < 0
    ? 7 * Math.ceil(Math.abs(weekday / 7))
    : 0;

  return (weekdayOffset + weekday) % 7;
}

function getFixedDateForWeekNumber(weekNumberType: string, date: Date) {
  const wd = date.getUTCDay();
  const fy = date.getUTCFullYear();
  const m = date.getUTCMonth();
  const d = date.getUTCDate();

  switch (weekNumberType) {
    case WEEK_NUMBER_TYPE.FIRST_4_DAY_WEEK:
      return  new Date(Date.UTC(fy, m, d - wd + 3));
    case WEEK_NUMBER_TYPE.FIRST_DAY_OF_YEAR:
      return new Date(Date.UTC(fy, m, d - wd + 6));
    case WEEK_NUMBER_TYPE.FIRST_FULL_WEEK:
      return new Date(Date.UTC(fy, m, d - wd));
    default:
      return date;
  }
}

/**
 * {@link https://bit.ly/2UvEN2y|Compute week number by type}
 * @param weekNumberType {string}
 * @param date {Date}
 * @return {}
 */
function computeWeekNumber(weekNumberType: string, date: Date) {
  const fixedNow = getFixedDateForWeekNumber(weekNumberType, date);
  const firstDayOfYear = new Date(Date.UTC(fixedNow.getUTCFullYear(), 0, 1));
  const wk = Math.ceil(((+fixedNow - +firstDayOfYear) / 864e5 + 1) / 7);

  return {
    originalDate: date,
    fixedDate: fixedNow,
    weekNumber: wk,
  };
}

export function calendarWeekdays({
  firstDayOfWeek,
  showWeekNumber,

  longWeekdayFormatter,
  narrowWeekdayFormatter,
}) {
  const fixedFirstDayOfWeek = 1 + ((firstDayOfWeek + (firstDayOfWeek < 0 ? 7 : 0)) % 7);
  const weekdays: unknown[] = showWeekNumber ? [{ label: 'Week', value: 'Wk' }] : [];

  for (let i = 0, len = 7; i < len; i += 1) {
    const dateDate = new Date(Date.UTC(2017, 0, fixedFirstDayOfWeek + i));

    weekdays.push({
      /** NOTE: Stripping LTR mark away for x-browser compatibilities and consistency reason */
      label: stripLTRMark(longWeekdayFormatter(dateDate)),
      value: stripLTRMark(narrowWeekdayFormatter(dateDate)),
    });
  }

  return weekdays;
}

//  Month Jan Feb Mar Apr May Jun Jul Aug Sep Oct Nov Dec
//  Days   31  28  31  30  31  30  31  31  30  31  30  31
//   31?    0       2       4       6   7       9      11
//   30?                3       5           8      10
//  Feb?        1
//  Su Mo Tu We Th Fr Sa    startDay - _firstDayOfWeek
//                  1  2        5 - 0 < 0 ? 6 : 5 - 0;
//  Mo Tu We Th Fr Sa Su
//               1  2  3        5 - 1 < 0 ? 6 : 5 - 1;
//  Tu We Th Fr Sa Su Mo
//            1  2  3  4        5 - 2 < 0 ? 6 : 5 - 2;
//  We Th Fr Sa Su Mo Tu
//         1  2  3  4  5        5 - 3 < 0 ? 6 : 5 - 3;
//  Th Fr Sa Su Mo Tu We
//      1  2  3  4  5  6        5 - 4 < 0 ? 6 : 5 - 4;
//  Fr Sa Su Mo Tu We Th
//   1  2  3  4  5  6  7        5 - 5 < 0 ? 6 : 5 - 5;
//  Sa Su Mo Tu We Th Fr
//                     1        5 - 6 < 0 ? 6 : 5 - 6;
export function calendarDays({
  firstDayOfWeek,
  selectedDate,
  showWeekNumber,
  weekNumberType,
  disabledDates,
  disabledDays,
  min,
  max,
  idOffset,

  fullDateFormatter,
  dayFormatter,
}) {
  const fy = selectedDate.getUTCFullYear();
  const selectedMonth = selectedDate.getUTCMonth();
  const totalDays = new Date(Date.UTC(fy, selectedMonth + 1, 0)).getUTCDate();
  const preFirstWeekday = new Date(Date.UTC(fy, selectedMonth, 1)).getUTCDay() - firstDayOfWeek;
  const firstWeekday = normalizeWeekday(preFirstWeekday);
  const totalCol = showWeekNumber ? 8 : 7;
  const firstWeekdayWithWeekNumberOffset = firstWeekday + (showWeekNumber ? 1 : 0);
  const fullCalendar: unknown[][] = [];
  const disabledDatesList: number[] = [];

  let calendarRow: unknown[] = [];
  let day = 1;
  let row = 0;
  let col = 0;
  let calendarFilled = false;
  /**
   * NOTE(motss): Thinking this is cool to write,
   * don't blame me for writing this kind of loop.
   * Optimization is totally welcome to make things faster.
   * Also, I'd like to learn a better way. PM me and we can talk about that. 😄
   */
  for (let i = 0, len = 6 * totalCol + (showWeekNumber ? 6 : 0); i <= len; i += 1, col += 1) {
    if (col >= totalCol) {
      col = 0;
      row += 1;
      fullCalendar.push(calendarRow);
      calendarRow = [];
    }

    if (i >= len) break;

    const rowVal = col + (row * totalCol);

    if (!calendarFilled && showWeekNumber && col < 1) {
      const { weekNumber } = computeWeekNumber(
        weekNumberType,
        new Date(Date.UTC(fy, selectedMonth, day - (row < 1 ? firstWeekday : 0))));
      const weekLabel = `Week ${weekNumber}`;

      calendarRow.push({
        fullDate: null,
        label: weekLabel,
        value: weekNumber,
        id: weekLabel,
        disabled: true,
      });
      // calendarRow.push(weekNumber);
      continue;
    }

    if (calendarFilled || rowVal < firstWeekdayWithWeekNumberOffset) {
      calendarRow.push({
        fullDate: null,
        label: null,
        value: null,
        id: (day + idOffset),
        disabled: true,
      });
      // calendarRow.push(null);
      continue;
    }

    const d = new Date(Date.UTC(fy, selectedMonth, day));
    const dTime = +d;
    const fullDate = d.toJSON();
    const isDisabledDay =
      disabledDays.some(ndd => ndd === col) ||
      disabledDates.some(ndd => ndd === dTime) ||
      (dTime < min || dTime > max);

    if (isDisabledDay) disabledDatesList.push(+d);

    calendarRow.push({
      fullDate,
      /** NOTE: Stripping LTR mark away for x-browser compatibilities and consistency reason */
      label: stripLTRMark(fullDateFormatter(d)),
      value: stripLTRMark(dayFormatter(d)),
      id: fullDate,
      disabled: isDisabledDay,
    });
    // calendarRow.push(day);
    day += 1;

    if (day > totalDays) calendarFilled = true;
  }

  return {
    calendar: fullCalendar,
    disabledDates: disabledDatesList,
  };
}

export function calendar({
  firstDayOfWeek,
  showWeekNumber,
  locale,
  selectedDate,
  weekNumberType,
  disabledDates,
  disabledDays,
  min,
  max,
  idOffset,

  longWeekdayFormatterFn,
  narrowWeekdayFormatterFn,
  dayFormatterFn,
  fullDateFormatterFn,
}) {
  const longWeekdayFormatter = longWeekdayFormatterFn == null
    ? Intl.DateTimeFormat(locale, { weekday: 'long', timeZone: 'UTC' }).format
    : longWeekdayFormatterFn;
  const narrowWeekdayFormatter = narrowWeekdayFormatterFn == null
    ? Intl.DateTimeFormat(locale, {
      /** NOTE: Only 'short' or 'narrow' (fallback) is allowed for 'weekdayFormat'. */
      // weekday: /^(short|narrow)/i.test(weekdayFormat)
      //   ? weekdayFormat
      //   : 'narrow',
      weekday: 'narrow',
      timeZone: 'UTC',
    }).format
    : narrowWeekdayFormatterFn;
  const dayFormatter = dayFormatterFn == null
    ? Intl.DateTimeFormat(locale, { day: 'numeric', timeZone: 'UTC' }).format
    : dayFormatterFn;
  const fullDateFormatter = fullDateFormatterFn == null
    ? Intl.DateTimeFormat(locale, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      weekday: 'short',
      timeZone: 'UTC',
    }).format
    : fullDateFormatterFn;

  const weekdays = calendarWeekdays({
    firstDayOfWeek,
    showWeekNumber,

    longWeekdayFormatter,
    narrowWeekdayFormatter,
  });
  const daysInMonth = calendarDays({
    dayFormatter,
    fullDateFormatter,

    firstDayOfWeek,
    selectedDate,
    showWeekNumber,
    weekNumberType,
    disabledDates,
    disabledDays,
    min,
    max,
    idOffset: idOffset == null ? 0 : idOffset,
  });

  return { weekdays, daysInMonth };
}
