import { Injectable, BadRequestException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { StringHour, StringHourDocument } from './schemas/string-hour.schema';
import { StringDay, StringDayDocument } from './schemas/string-day.schema';
import { GMDay, GMDayDocument } from './schemas/gm-day.schema';
import * as moment from 'moment';

@Injectable()
export class DashboardService {
  constructor(
    @InjectModel(StringHour.name)
    private stringHourModel: Model<StringHourDocument>,
    @InjectModel(StringDay.name)
    private stringDayModel: Model<StringDayDocument>,
    @InjectModel(GMDay.name)
    private gmDayModel: Model<GMDayDocument>,
  ) {}

  async getDashCostData(payload: { option: number }) {
    const { option } = payload;

    if (![1, 2, 3].includes(option)) {
      throw new BadRequestException(
        'Invalid option. Only options 1, 2, and 3 are supported.',
      );
    }
    let pipeline: any[] = [];
    if (option === 1) {
      //   startDate = moment().subtract(2, 'days').format('YYYY-MM-DD'); // Day before yesterday
      //   endDate = moment().subtract(1, 'days').format('YYYY-MM-DD'); // Yesterday
      const startDate = '2024-09-21'; // Day before yesterday
      const endDate = '2024-09-22'; // Yesterday

      pipeline = [
        {
          $match: {
            Day_Hour: {
              $regex: `^(${startDate}|${endDate})`,
              $options: 'i',
            },
          },
        },
        {
          $addFields: {
            date: { $substr: ['$Day_Hour', 0, 10] },
          },
        },
        {
          $group: {
            _id: { date: '$date' },
            active_power_sum: { $sum: '$P_abd' },
          },
        },
        { $sort: { '_id.date': 1 as 1 | -1 } },
      ];

      const results = await this.stringHourModel.aggregate(pipeline);

      if (results.length === 0) {
        throw new BadRequestException(
          'No data found for the given date range.',
        );
      }

      // Convert results to a dictionary format
      const dataByDate = Object.fromEntries(
        results.map((r) => [r._id.date, Math.round(r.active_power_sum)]),
      );

      const yesterdayStr = '2024-09-22';
      const dayBeforeYesterdayStr = '2024-09-21';

      const labels = [yesterdayStr, dayBeforeYesterdayStr];
      const data = labels.map((date) => dataByDate[date] || 0);

      return {
        labels,
        datasets: [
          {
            label: 'Active Power',
            data,
            backgroundColor: 'rgba(75, 192, 192, 0.2)',
            fill: true,
            tension: 0.4,
            borderWidth: 3,
          },
        ],
      };
    }
    if (option === 2) {
      const now = moment();
      const firstDayCurrentMonth = now.clone().startOf('month');
      const lastDayLastMonth = firstDayCurrentMonth.clone().subtract(1, 'day');
      const firstDayLastMonth = lastDayLastMonth.clone().startOf('month');

      const pipeline = [
        {
          $match: {
            Day: {
              $gte: firstDayLastMonth.format('YYYY-MM-DD'),
              $lte: now.format('YYYY-MM-DD'),
            },
          },
        },
        {
          $addFields: {
            month: {
              $dateToString: { format: '%Y-%m', date: { $toDate: '$Day' } },
            },
          },
        },
        {
          $group: {
            _id: '$month', // Yeh already "YYYY-MM" format mein hai
            active_power_sum: { $sum: '$P_abd' },
          },
        },
        { $sort: { _id: 1 as 1 | -1 } },
      ];

      const results = await this.stringDayModel.aggregate(pipeline);

      // Data ko object format mein convert karna
      const dataByMonth = results.reduce((acc, record) => {
        acc[record._id] = Math.round(record.active_power_sum);
        return acc;
      }, {});

      const currentMonthStr = firstDayCurrentMonth.format('YYYY-MM');
      const lastMonthStr = firstDayLastMonth.format('YYYY-MM');

      const labels = [
        firstDayLastMonth.format('MMMM YYYY'),
        firstDayCurrentMonth.format('MMMM YYYY'),
      ];

      const data = [
        dataByMonth[lastMonthStr] || 0,
        dataByMonth[currentMonthStr] || 0,
      ];

      return {
        labels,
        datasets: [
          {
            label: 'Active Power',
            data,
            backgroundColor: 'rgba(75, 192, 192, 0.4)',
            fill: true,
            tension: 0.4,
          },
        ],
      };
    }
    if (option === 3) {
      const currentYear = moment().year();
      const lastYear = currentYear - 1;

      const pipeline = [
        {
          $match: {
            Day: { $exists: true, $ne: null },
          },
        },
        {
          $addFields: {
            year: { $substr: ['$Day', 0, 4] },
          },
        },
        {
          $group: {
            _id: { year: '$year' },
            active_power_sum: { $sum: '$P_abd' },
          },
        },
        { $sort: { _id: 1 as 1 | -1 } },
      ];

      const results = await this.stringDayModel.aggregate(pipeline);

      // Data ko object format mein convert karna
      const dataByYear = results.reduce((acc, record) => {
        acc[record._id.year] = Math.round(record.active_power_sum);
        return acc;
      }, {});

      return {
        labels: [String(lastYear), String(currentYear)],
        datasets: [
          {
            label: 'Active Power',
            data: [
              dataByYear[String(lastYear)] || 0,
              dataByYear[String(currentYear)] || 0,
            ],
            backgroundColor: 'rgba(75, 192, 192, 0.4)',
            fill: true,
            tension: 0.4,
          },
        ],
      };
    }
  }
  //2nd api
  async getDashData(payload: { option: number }) {
    const { option } = payload;

    if (![1, 2, 3].includes(option)) {
      throw new BadRequestException(
        'Invalid option. Only options 1, 2, and 3 are supported.',
      );
    }
    if (option === 1) {
      // const yesterday = moment().subtract(1, 'days').format('YYYY-MM-DD');
      // const dayBeforeYesterday = moment()
      //   .subtract(2, 'days')
      //   .format('YYYY-MM-DD');
      const yesterday = '2024-09-22';
      const dayBeforeYesterday = '2024-09-21';
      const queries = [
        { Day_Hour: { $regex: `^${yesterday}` } },
        { Day_Hour: { $regex: `^${dayBeforeYesterday}` } },
      ];

      const pipeline = [
        { $match: { $or: queries } },
        {
          $group: {
            _id: {
              plant: '$Plant',
              day_hour: '$Day_Hour',
            },
            active_power_sum: { $sum: '$P_abd' },
          },
        },
        { $sort: { '_id.day_hour': 1 as 1 | -1 } },
      ];

      const results = await this.stringHourModel.aggregate(pipeline);

      if (results.length === 0) {
        throw new BadRequestException(
          'No data found for the given date range.',
        );
      }

      // ✅ Explicitly define array types
      const yesterdayData: { hour: number; value: number; plant: string }[] =
        [];
      const dayBeforeYesterdayData: {
        hour: number;
        value: number;
        plant: string;
      }[] = [];
      const allHours = new Set<number>();

      results.forEach((record) => {
        const plant: string = record._id.plant;
        const dayHour: string = record._id.day_hour;
        const activePowerSum: number = record.active_power_sum;

        const hour = parseInt(dayHour.split(' ')[1], 10);
        allHours.add(hour);

        if (dayHour.startsWith(yesterday)) {
          yesterdayData.push({ hour, value: activePowerSum, plant });
        } else if (dayHour.startsWith(dayBeforeYesterday)) {
          dayBeforeYesterdayData.push({ hour, value: activePowerSum, plant });
        }
      });

      const sortedHours = [...allHours].sort((a, b) => a - b);
      const labels = sortedHours.map((hour) => `Hour ${hour}`);

      return {
        labels,
        datasets: [
          {
            label: yesterday,
            data: sortedHours.map(
              (hour) => yesterdayData.find((d) => d.hour === hour)?.value || 0,
            ),
            backgroundColor: 'rgba(75, 192, 192, 0.4)',
            borderColor: 'rgba(75, 192, 192, 1)',
            fill: true,
            tension: 0.4,
          },
          {
            label: dayBeforeYesterday,
            data: sortedHours.map(
              (hour) =>
                dayBeforeYesterdayData.find((d) => d.hour === hour)?.value || 0,
            ),
            backgroundColor: 'rgba(255, 99, 132, 0.4)',
            borderColor: 'rgba(255, 99, 132, 1)',
            fill: true,
            tension: 0.4,
          },
        ],
      };
    }

    if (option === 2) {
      // Get current and last month
      const now = moment();
      const firstDayCurrentMonth = now.startOf('month');
      const lastDayLastMonth = firstDayCurrentMonth.clone().subtract(1, 'day');
      const firstDayLastMonth = lastDayLastMonth.clone().startOf('month');

      const pipeline = [
        {
          $match: {
            Day: { $exists: true, $ne: null },
          },
        },
        {
          $addFields: {
            parsedDate: {
              $dateFromString: { dateString: '$Day', format: '%Y-%m-%d' },
            },
          },
        },
        {
          $addFields: {
            week: {
              $switch: {
                branches: [
                  {
                    case: { $lte: [{ $dayOfMonth: '$parsedDate' }, 7] },
                    then: 1,
                  },
                  {
                    case: { $lte: [{ $dayOfMonth: '$parsedDate' }, 14] },
                    then: 2,
                  },
                  {
                    case: { $lte: [{ $dayOfMonth: '$parsedDate' }, 21] },
                    then: 3,
                  },
                  {
                    case: { $lte: [{ $dayOfMonth: '$parsedDate' }, 28] },
                    then: 4,
                  },
                ],
                default: 4,
              },
            },
            month: { $month: '$parsedDate' },
          },
        },
        {
          $group: {
            _id: { month: '$month', week: '$week' },
            active_power_sum: { $sum: '$P_abd' },
          },
        },
        {
          $sort: { '_id.week': 1 as 1 | -1 },
        },
      ];

      const results = await this.stringDayModel.aggregate(pipeline);

      // Process results into datasets
      const currentMonthData = [0, 0, 0, 0]; // Weeks 1 to 4
      const lastMonthData = [0, 0, 0, 0]; // Weeks 1 to 4

      results.forEach((record) => {
        const { month, week } = record._id;
        const activePowerSum = record.active_power_sum;

        if (month === firstDayCurrentMonth.month() + 1) {
          currentMonthData[week - 1] += activePowerSum;
        } else if (month === firstDayLastMonth.month() + 1) {
          lastMonthData[week - 1] += activePowerSum;
        }
      });

      // Response structure
      return {
        labels: ['Week 1', 'Week 2', 'Week 3', 'Week 4'],
        datasets: [
          {
            label: firstDayCurrentMonth.format('MMMM'),
            data: currentMonthData,
            backgroundColor: 'rgba(75, 192, 192, 0.4)',
            borderColor: 'rgba(75, 192, 192, 1)',
            fill: true,
            tension: 0.4,
          },
          {
            label: firstDayLastMonth.format('MMMM'),
            data: lastMonthData,
            backgroundColor: 'rgba(255, 99, 132, 0.4)',
            borderColor: 'rgba(255, 99, 132, 1)',
            fill: true,
            tension: 0.4,
          },
        ],
      };
    }
    if (option === 3) {
      const currentYear = moment().year();
      const lastYear = currentYear - 1;

      const pipeline = [
        {
          $match: {
            Day: { $exists: true, $ne: null },
          },
        },
        {
          $addFields: {
            parsedDate: {
              $dateFromString: { dateString: '$Day', format: '%Y-%m-%d' },
            },
          },
        },
        {
          $addFields: {
            quarter: {
              $switch: {
                branches: [
                  { case: { $lte: [{ $month: '$parsedDate' }, 3] }, then: 1 },
                  { case: { $lte: [{ $month: '$parsedDate' }, 6] }, then: 2 },
                  { case: { $lte: [{ $month: '$parsedDate' }, 9] }, then: 3 },
                  { case: { $lte: [{ $month: '$parsedDate' }, 12] }, then: 4 },
                ],
                default: 4,
              },
            },
            year: { $year: '$parsedDate' },
          },
        },
        {
          $group: {
            _id: { year: '$year', quarter: '$quarter' },
            active_power_sum: { $sum: '$P_abd' },
          },
        },
        {
          $sort: { '_id.year': 1 as 1 | -1, '_id.quarter': 1 as 1 | -1 },
        },
      ];

      const results = await this.stringDayModel.aggregate(pipeline);

      // Initialize quarter data for both years
      const quarterDataCurrentYear = [0, 0, 0, 0]; // Q1 - Q4 (Current Year)
      const quarterDataLastYear = [0, 0, 0, 0]; // Q1 - Q4 (Last Year)

      for (const record of results) {
        const { year, quarter } = record._id;
        const activePowerSum = record.active_power_sum;

        if (year === currentYear) {
          quarterDataCurrentYear[quarter - 1] += activePowerSum;
        } else if (year === lastYear) {
          quarterDataLastYear[quarter - 1] += activePowerSum;
        }
      }

      return {
        labels: ['Quarter 1', 'Quarter 2', 'Quarter 3', 'Quarter 4'],
        datasets: [
          {
            label: `${lastYear}`,
            data: quarterDataLastYear,
            backgroundColor: 'rgba(75, 192, 192, 0.4)',
            borderColor: 'rgba(75, 192, 192, 1)',
            fill: true,
            tension: 0.4,
          },
          {
            label: `${currentYear}`,
            data: quarterDataCurrentYear,
            backgroundColor: 'rgba(255, 99, 132, 0.4)',
            borderColor: 'rgba(255, 99, 132, 1)',
            fill: true,
            tension: 0.4,
          },
        ],
      };
    }
  }

  async getDashColumnData(payload: { option: number }) {
    const { option } = payload;

    if (![1, 2, 3].includes(option)) {
      throw new BadRequestException(
        'Invalid option. Only options 1, 2, and 3 are supported.',
      );
    }
    if (option === 1) {
      // Get yesterday's date as a string
      // const yesterday = moment().subtract(1, 'days').format('YYYY-MM-DD');
      const yesterday = '2024-09-21';
      // Define aggregation pipeline
      const pipeline = [
        { $match: { Day_Hour: { $regex: `^${yesterday}` } } },
        {
          $group: {
            _id: {
              plant: '$Plant',
              day_hour: '$Day_Hour',
            },
            active_power_sum: { $sum: '$P_abd' },
          },
        },
        { $sort: { '_id.day_hour': 1 as 1 | -1 } },
      ];

      // Execute aggregation
      const results = await this.stringHourModel.aggregate(pipeline);

      if (results.length === 0) {
        throw new BadRequestException('No data found for yesterday.');
      }

      // Define arrays for processed data
      const yesterdayData: { hour: number; value: number; plant: string }[] =
        [];
      const allHours = new Set<number>();

      // Process results
      results.forEach((record) => {
        const plant: string = record._id.plant;
        const dayHour: string = record._id.day_hour;
        const activePowerSum: number = record.active_power_sum;

        // Extract hour from Day_Hour (e.g., "2024-09-22 14" → 14)
        const hour = parseInt(dayHour.split(' ')[1], 10);
        allHours.add(hour);

        // Store power values
        yesterdayData.push({ hour, value: activePowerSum, plant });
      });

      // Sort hours and prepare labels
      const sortedHours = [...allHours].sort((a, b) => a - b);
      const labels = sortedHours.map((hour) => `Hour ${hour}`);

      // Compute Power (KW) and Cost (Power * 60 PKR)
      const powerData = sortedHours.map(
        (hour) => yesterdayData.find((d) => d.hour === hour)?.value || 0,
      );
      const costData = powerData.map((value) => value * 60);

      return {
        labels,
        datasets: [
          {
            type: 'bar',
            label: 'Power (KW)',
            data: powerData,
            backgroundColor: 'rgba(75, 192, 192, 0.4)',
            borderColor: 'rgba(75, 192, 192, 1)',
            fill: true,
            tension: 0.4,
          },
          {
            type: 'line',
            label: 'Cost (PKR)',
            data: costData,
            borderColor: 'rgba(255, 99, 132, 1)',
            backgroundColor: 'rgba(255, 99, 132, 0.2)',
            fill: false,
            tension: 0.4,
            yAxisID: 'y-axis-cost', // Add secondary Y-axis for cost
          },
        ],
      };
    }

    if (option === 2) {
      const now = moment();
      const currentMonth = now.month() + 1; // Moment months are 0-based
      const currentYear = now.year();

      const pipeline = [
        { $match: { Day: { $exists: true, $ne: null } } },
        {
          $addFields: {
            parsedDate: {
              $dateFromString: { dateString: '$Day', format: '%Y-%m-%d' },
            },
          },
        },
        {
          $match: {
            $expr: {
              $and: [
                { $eq: [{ $month: '$parsedDate' }, currentMonth] },
                { $eq: [{ $year: '$parsedDate' }, currentYear] },
              ],
            },
          },
        },
        {
          $addFields: {
            week: { $ceil: { $divide: [{ $dayOfMonth: '$parsedDate' }, 7] } },
          },
        },
        {
          $group: {
            _id: { week: '$week' },
            active_power_sum: { $sum: '$P_abd' },
          },
        },
        { $sort: { '_id.week': 1 as 1 | -1 } },
      ];

      const results = await this.stringDayModel.aggregate(pipeline);

      const currentMonthData = [0, 0, 0, 0]; // Weeks 1 to 4

      results.forEach((record) => {
        const week: number = record._id.week;
        const activePowerSum: number = record.active_power_sum;
        if (week >= 1 && week <= 4) {
          currentMonthData[week - 1] += activePowerSum;
        }
      });

      const costData = currentMonthData.map((value) => value * 60);
      const labels = ['Week 1', 'Week 2', 'Week 3', 'Week 4'];

      return {
        labels,
        datasets: [
          {
            type: 'bar',
            label: 'Power (KW)',
            data: currentMonthData,
            backgroundColor: 'rgba(75, 192, 192, 0.4)',
            borderColor: 'rgba(75, 192, 192, 1)',
            fill: true,
            tension: 0.4,
          },
          {
            type: 'line',
            label: 'Cost (PKR)',
            data: costData,
            borderColor: 'rgba(255, 99, 132, 1)',
            backgroundColor: 'rgba(255, 99, 132, 0.2)',
            fill: false,
            tension: 0.4,
            yAxisID: 'y-axis-cost',
          },
        ],
      };
    }
    if (option === 3) {
      const currentYear = new Date().getFullYear();

      const pipeline = [
        {
          $match: {
            Day: { $exists: true, $ne: null },
          },
        },
        {
          $addFields: {
            parsedDate: {
              $dateFromString: {
                dateString: '$Day',
                format: '%Y-%m-%d',
              },
            },
          },
        },
        {
          $match: {
            $expr: { $eq: [{ $year: '$parsedDate' }, currentYear] },
          },
        },
        {
          $addFields: {
            quarter: {
              $switch: {
                branches: [
                  { case: { $lte: [{ $month: '$parsedDate' }, 3] }, then: 1 },
                  { case: { $lte: [{ $month: '$parsedDate' }, 6] }, then: 2 },
                  { case: { $lte: [{ $month: '$parsedDate' }, 9] }, then: 3 },
                  { case: { $lte: [{ $month: '$parsedDate' }, 12] }, then: 4 },
                ],
                default: 4,
              },
            },
          },
        },
        {
          $group: {
            _id: { quarter: '$quarter' },
            active_power_sum: { $sum: '$P_abd' },
          },
        },
        {
          $sort: { '_id.quarter': 1 as 1 | -1 },
        },
      ];

      const results = await this.stringDayModel.aggregate(pipeline);

      // Initialize quarter data
      const quarterDataCurrentYear = [0, 0, 0, 0];

      results.forEach((record) => {
        const quarter = record._id.quarter;
        const activePowerSum = record.active_power_sum;
        if (quarter >= 1 && quarter <= 4) {
          quarterDataCurrentYear[quarter - 1] += activePowerSum;
        }
      });

      const costData = quarterDataCurrentYear.map((value) => value * 60);

      const response = {
        labels: ['Quarter 1', 'Quarter 2', 'Quarter 3', 'Quarter 4'],
        datasets: [
          {
            type: 'bar',
            label: 'Power (KW)',
            data: quarterDataCurrentYear,
            backgroundColor: 'rgba(75, 192, 192, 0.4)',
            borderColor: 'rgba(75, 192, 192, 1)',
            fill: true,
            tension: 0.4,
          },
          {
            type: 'line',
            label: 'Cost (PKR)',
            data: costData,
            borderColor: 'rgba(255, 99, 132, 1)',
            backgroundColor: 'rgba(255, 99, 132, 0.2)',
            fill: false,
            tension: 0.4,
            yAxisID: 'y-axis-cost',
          },
        ],
      };
      return response;
    }
  }

  async getDashStatData(payload: { option: number }) {
    const { option } = payload;

    if (![1, 2, 3].includes(option)) {
      throw new BadRequestException(
        'Invalid option. Only options 1, 2, and 3 are supported.',
      );
    }
    if (option === 1) {
      // Get yesterday's date as a string
      // const yesterday = moment().subtract(1, 'days').format('YYYY-MM-DD');
      const yesterday = '2024-09-21';
      // Define aggregation pipeline
      const pipeline = [
        { $match: { Day_Hour: { $regex: `^${yesterday}` } } },
        {
          $group: {
            _id: null, // Single group for the whole day
            active_power_sum: { $sum: '$P_abd' },
          },
        },
      ];

      // Execute aggregation
      const results = await this.stringHourModel.aggregate(pipeline);

      const kw =
        results.length > 0 ? Math.round(results[0].active_power_sum) : 0;

      const capacity = 2400; // Fixed capacity
      const predictedco2 = Math.round(capacity * 0.56);
      const actualco2 = Math.round(kw * 0.56);

      return {
        actualco2,
        capacity,
        kw,
        predictedco2,
      };
    }

    if (option === 2) {
      const now = moment();
      const firstDayCurrentMonth = now.startOf('month').format('YYYY-MM-DD');

      const pipeline = [
        { $match: { Day: { $gte: firstDayCurrentMonth } } },
        {
          $addFields: {
            month: { $substr: ['$Day', 0, 7] },
          },
        },
        {
          $group: {
            _id: { month: '$month' },
            active_power_sum: { $sum: '$P_abd' },
            unique_days: { $addToSet: '$Day' }, // Collect unique days
          },
        },
        { $sort: { '_id.month': 1 as 1 | -1 } },
      ];

      const results = await this.stringDayModel.aggregate(pipeline);

      const kw =
        results.length > 0 ? Math.round(results[0].active_power_sum) : 0;
      const uniqueDaysCount =
        results.length > 0 ? results[0].unique_days.length : 0;

      const capacity = uniqueDaysCount * 2400;
      const predictedco2 = Math.round(capacity * 0.56);
      const actualco2 = Math.round(kw * 0.56);

      return {
        actualco2,
        capacity,
        kw,
        predictedco2,
      };
    }
    if (option === 3) {
      const currentYear = new Date().getFullYear();
      const yearRegex = `^${currentYear}`;

      const pipeline = [
        { $match: { Day: { $regex: yearRegex } } },
        {
          $addFields: {
            year: { $substr: ['$Day', 0, 4] },
          },
        },
        {
          $group: {
            _id: { year: '$year' },
            active_power_sum: { $sum: '$P_abd' },
            unique_days: { $addToSet: '$Day' }, // Collect unique days
          },
        },
        { $sort: { '_id.year': 1 as 1 | -1 } }, // ✅ Fix sorting issue
      ];

      const results = await this.stringDayModel.aggregate(pipeline);

      const kw = results.length ? Math.round(results[0].active_power_sum) : 0;
      const uniqueDaysCount = results.length
        ? results[0].unique_days.length
        : 0;
      const capacity = uniqueDaysCount * 2400;
      const predictedco2 = Math.round(capacity * 0.56);
      const actualco2 = Math.round(kw * 0.56);

      return {
        actualco2,
        capacity,
        kw,
        predictedco2,
      };
    }
  }

  async getDashActiveData(payload: { option: number }) {
    const { option } = payload;

    if (![1, 2, 3].includes(option)) {
      throw new BadRequestException(
        'Invalid option. Only options 1, 2, and 3 are supported.',
      );
    }
    if (option === 1) {
      // Get yesterday's date as a string
      // const yesterday = moment().subtract(1, 'days').format('YYYY-MM-DD');
      const yesterday = '2024-09-21';
      // Define aggregation pipeline
      const pipeline = [
        { $match: { Day: yesterday } },
        {
          $group: {
            _id: null,
            active_power_sum: { $sum: '$active_power' },
          },
        },
      ];

      // Execute aggregation
      const results = await this.gmDayModel.aggregate(pipeline);

      return {
        [yesterday]:
          results.length > 0 ? Math.round(results[0].active_power_sum) : 0,
      };
    }

    if (option === 2) {
      const now = moment();
      const firstDayCurrentMonth = now.startOf('month').format('YYYY-MM-DD');

      const pipeline = [
        {
          $match: {
            Day: { $gte: firstDayCurrentMonth }, // Fetch data only for current month
          },
        },
        {
          $addFields: {
            month: { $substr: ['$Day', 0, 7] }, // Extract "YYYY-MM"
          },
        },
        {
          $group: {
            _id: { month: '$month' },
            active_power_sum: { $sum: '$active_power' },
          },
        },
        { $sort: { '_id.month': 1 as 1 | -1 } },
      ];

      const results = await this.gmDayModel.aggregate(pipeline).exec();

      return results.reduce((acc, record) => {
        acc[record._id.month] = Math.round(record.active_power_sum);
        return acc;
      }, {});
    }
    if (option === 3) {
      const currentYear = new Date().getFullYear().toString(); // Convert to string

      const pipeline = [
        {
          $match: {
            Day: { $regex: `^${currentYear}` } // Match only current year
          }
        },
        {
          $addFields: {
            year: { $substr: ['$Day', 0, 4] } // Extract year (YYYY)
          }
        },
        {
          $group: {
            _id: { year: '$year' },
            active_power_sum: { $sum: '$active_power' }
          }
        },
        { $sort: { '_id.year': 1 as 1 | -1 } } // ✅ Fix TypeScript sorting issue
      ];

      const results = await this.gmDayModel.aggregate(pipeline).exec();

      // Format response
    const response = results.reduce((acc, record) => {
      acc[record._id.year] = Math.round(record.active_power_sum);
      return acc;
    }, {});

    return response;
    }
  }
}
