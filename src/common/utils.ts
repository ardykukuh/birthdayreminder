import { User } from '../modules/user/entities/user.entity';
import * as moment from 'moment-timezone';

export const scheduleBirthdayNotifications = async (
  user: User,
): Promise<{ scheduleAt: Date; scheduleFormat: string }> => {
  const currentYear = moment().year();

  const userBirthday = moment(user.birthday).year(currentYear);

  // Schedule for 9 AM in the user's timezone
  const userTimezone = user.timezone;
  const notificationTime = userBirthday
    .tz(userTimezone)
    .set({ hour: 9, minute: 0, second: 0 });

  // If the birthday has passed for this year, schedule for next year
  if (notificationTime.isBefore(moment())) {
    notificationTime.add(1, 'year');
  }
  return {
    scheduleAt: notificationTime.toDate(),
    scheduleFormat: notificationTime.format(),
  };
};
